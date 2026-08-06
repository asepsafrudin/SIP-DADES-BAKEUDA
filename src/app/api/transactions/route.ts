import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';
import { logger } from '@/utils/logger';
import { verifyAuth } from '@/lib/authMiddleware';
import { normalizeRules, validateTransaction } from '@/lib/validations/ruleEvaluator';

interface TransactionItem {
  nama_desa: string;
  kegiatan: string;
  nominal: number;
  no_rekening: string;
}

// Fungsi sederhana untuk menghitung Jarak Levenshtein
const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[a.length][b.length];
};

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';

export async function POST(req: NextRequest) {
  // Auth Guard: Hanya BAKEUDA & SUPER_ADMIN yang boleh simpan transaksi pencairan
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const { data, sumber_dana, tahun, no_surat } = await req.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    if (!sumber_dana || !tahun) {
      return NextResponse.json({ error: 'Sumber Dana dan Tahun wajib diisi' }, { status: 400 });
    }

    // Proses simpan data (Parallel)
    const promises = data.map(async (item: TransactionItem) => {
      // 1. Parsing Nama Desa & Kecamatan dari teks OCR (Contoh: "Panican Kec. Kemangkon")
      const parts = item.nama_desa.split(/ Kec\. /i);
      const namaDesaAsli = parts[0].trim().toUpperCase();
      const namaKecamatan = parts.length > 1 ? parts[1].trim().toUpperCase() : '';

      // Gunakan pencarian EXACT match pertama kali
      const exactQueries = [Query.equal('nama_desa', namaDesaAsli)];
      if (namaKecamatan) exactQueries.push(Query.equal('kecamatan', namaKecamatan));
      
      const desaQuery = await databases.listDocuments(DB_ID, 'master_desa', exactQueries);
      let matchedDesa = desaQuery.total > 0 ? desaQuery.documents[0] : null;

      // FALLBACK: Fuzzy Match Sebenarnya (Levenshtein Distance)
      if (!matchedDesa && namaKecamatan) {
        const kecQuery = await databases.listDocuments(DB_ID, 'master_desa', [
          Query.equal('kecamatan', namaKecamatan),
          Query.limit(50) // Ambil semua desa di kecamatan itu
        ]);

        let bestMatch = null;
        let minDistance = 999;

        for (const d of kecQuery.documents) {
          const dist = levenshtein(namaDesaAsli, d.nama_desa);
            // Toleransi typo: maksimal 3 huruf salah, atau kemiripan sangat tinggi
            if (dist < minDistance && dist <= 3) {
              minDistance = dist;
              bestMatch = d;
            }
          }

          if (bestMatch) {
            matchedDesa = bestMatch;
          }
        }

        if (!matchedDesa) {
          throw new Error(`Desa "${namaDesaAsli}" (Kec. ${namaKecamatan}) tidak ditemukan di Master Database (Meskipun sudah dicoba toleransi typo OCR).`);
        }
        
        // Ambil ID Desa yang tepat
        const desaId = matchedDesa.$id;

        // 2. Pencarian Pagu Alokasi
        const paguQuery = await databases.listDocuments(DB_ID, 'pagu_alokasi', [
          Query.equal('desa', desaId),
          Query.equal('sumber_dana', sumber_dana),
          Query.equal('tahun_anggaran', parseInt(tahun))
        ]);

        // Sesuai Aturan Bisnis: Jika pagu tidak ada, Tolak Transaksi!
        if (paguQuery.total === 0) {
          throw new Error(`Pagu Alokasi untuk "${desaQuery.documents[0].nama_desa}" belum dibuat.`);
        }
        const paguId = paguQuery.documents[0].$id;

        // 3. Pencegahan Duplikasi (Lapis 2)
        // Mengecek apakah sudah ada transaksi DRAFT dengan Pagu dan Nomor Rekomendasi yang sama
        if (no_surat) {
          const dupQuery = await databases.listDocuments(DB_ID, 'transaksi_pencairan', [
            Query.equal('pagu', paguId),
            Query.equal('status_verifikasi', 'DRAFT'),
            Query.equal('no_rekomendasi', no_surat)
          ]);

          if (dupQuery.total > 0) {
            throw new Error(`Indikasi Duplikat: Transaksi dengan Surat "${no_surat}" untuk desa ini sudah ada di antrean DRAFT.`);
          }
        }

      // 4. Simpan sebagai Transaksi Pencairan (Draft)
      const transaksi = await databases.createDocument(
        DB_ID, 
        'transaksi_pencairan', 
        ID.unique(),
        {
          desa_id: desaId,
          pagu_id: paguId,
          tahap_ke: "Rekomendasi Scanner", 
          nominal_pengajuan: item.nominal,
          nominal_pencairan_net: item.nominal,
          keterangan: item.kegiatan,
          status_verifikasi: "DRAFT",
          no_rekomendasi: no_surat || ''
        }
      );

      return transaksi;
    });

    const settledResults = await Promise.allSettled(promises);

    const errors: { nama_desa: string, reason: string }[] = [];
    const results: unknown[] = [];

    settledResults.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        results.push(res.value);
      } else {
        const item = data[index] as TransactionItem;
        errors.push({ 
          nama_desa: item.nama_desa || 'Unknown', 
          reason: res.reason instanceof Error ? res.reason.message : String(res.reason) 
        });
      }
    });

    logger.info('TRANSACTIONS_API', 'Berhasil memproses transaksi batch', { 
      saved: results.length, failed: errors.length 
    });

    return NextResponse.json({ 
      success: true, 
      saved: results.length, 
      failed: errors.length,
      errors 
    });

  } catch (error: unknown) {
    logger.error('TRANSACTIONS_API', 'Save Error', error);
    const message = error instanceof Error ? error.message : 'Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Auth Guard: Hanya BAKEUDA & SUPER_ADMIN yang boleh menyetujui transaksi
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const { id, status_verifikasi } = await req.json();
    const status = status_verifikasi;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID transaksi dan status_verifikasi baru wajib dikirim.' }, { status: 400 });
    }

    if (status !== 'DISETUJUI' && status !== 'DITOLAK' && status !== 'DRAFT') {
      return NextResponse.json({ error: 'Status tidak valid.' }, { status: 400 });
    }

    // 1. Ambil dokumen transaksi pencairan
    const doc = await databases.getDocument(DB_ID, 'transaksi_pencairan', id);

    // 2. Jika status berubah menjadi DISETUJUI, jalankan Symbolic Rule Engine
    if (status === 'DISETUJUI') {
      // Ambil tahun dari pagu alokasi terkait untuk menarik regulasi yang pas
      let tahunAnggaran = 2026;
      try {
        const paguDoc = await databases.getDocument(DB_ID, 'pagu_alokasi', doc.pagu ?? doc.pagu_id);
        tahunAnggaran = paguDoc.tahun_anggaran || 2026;
      } catch (err) {
        logger.warn('TRANSACTIONS_PATCH', `Gagal mengambil tahun_anggaran dari pagu: ${doc.pagu ?? doc.pagu_id}`);
      }

      // Ambil regulasi aktif
      let rulesJson: any = {
        tahun_anggaran: tahunAnggaran,
        perbup_add: { limit_bulanan: 0.08333 },
        bpjs: { iuran_pemda_pct: 0.04, bulan_potongan: 'Januari' }
      };

      try {
        const regRes = await databases.listDocuments(DB_ID, 'master_regulasi', [
          Query.equal('tahun_anggaran', tahunAnggaran),
          Query.limit(1)
        ]);
        if (regRes.total > 0 && regRes.documents[0].rules_json) {
          rulesJson = typeof regRes.documents[0].rules_json === 'string'
            ? JSON.parse(regRes.documents[0].rules_json)
            : regRes.documents[0].rules_json;
        }
      } catch (err) {
        logger.warn('TRANSACTIONS_PATCH', 'Gagal memuat master_regulasi dari DB, menggunakan fallback default');
      }

      const normalizedRules = normalizeRules(rulesJson);

      // Jalankan validator guardrail
      const validation = await validateTransaction(
        databases,
        DB_ID,
        {
          $id: doc.$id,
          desa_id: doc.desa_id,
          jenis_dana: doc.jenis_dana || 'ADD',
          bulan_penyaluran: doc.bulan_penyaluran || 'Agustus 2026',
          tahap_ke: doc.tahap_ke || 'Rekomendasi Scanner',
          nominal_pengajuan: doc.nominal_pengajuan || 0,
          potongan_bpjs: doc.potongan_bpjs || 0
        },
        normalizedRules
      );

      if (!validation.valid) {
        logger.warn('TRANSACTIONS_PATCH', 'Transaksi ditolak oleh Rules-as-Code Guardrail', {
          id,
          errors: validation.errors
        });
        return NextResponse.json({
          status: 'error',
          message: validation.errors.join(' '),
          errors: validation.errors,
          pasal: validation.pasalRujukan
        }, { status: 400 });
      }
    }

    // 3. Update status transaksi di database
    const updatedDoc = await databases.updateDocument(DB_ID, 'transaksi_pencairan', id, {
      status_verifikasi: status
    });

    return NextResponse.json({
      status: 'success',
      message: `Status transaksi berhasil diubah menjadi ${status}.`,
      data: updatedDoc
    });

  } catch (error: any) {
    logger.error('TRANSACTIONS_PATCH', 'Gagal memperbarui status transaksi', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

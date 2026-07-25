import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';

export async function POST(req: NextRequest) {
  try {
    const { data, sumber_dana, tahun, no_surat } = await req.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    if (!sumber_dana || !tahun) {
      return NextResponse.json({ error: 'Sumber Dana dan Tahun wajib diisi' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Proses simpan data (Batch/Sequential)
    for (const item of data) {
      try {
        // 1. Parsing Nama Desa & Kecamatan dari teks OCR (Contoh: "Panican Kec. Kemangkon")
        const parts = item.nama_desa.split(/ Kec\. /i);
        const namaDesaAsli = parts[0].trim().toUpperCase();
        const namaKecamatan = parts.length > 1 ? parts[1].trim().toUpperCase() : '';

        // Gunakan pencarian EXACT match pertama kali
        const exactQueries = [Query.equal('nama_desa', namaDesaAsli)];
        if (namaKecamatan) exactQueries.push(Query.equal('kecamatan', namaKecamatan));
        
        let desaQuery = await databases.listDocuments(DB_ID, 'master_desa', exactQueries);
        let matchedDesa = desaQuery.total > 0 ? desaQuery.documents[0] : null;

        // FALLBACK: Fuzzy Match Sebenarnya (Levenshtein Distance)
        // Jika EXACT gagal (biasanya karena typo OCR seperti "Kailialang" -> "Kalialang"), 
        // kita ambil semua desa di kecamatan tersebut dan cari kemiripan tertinggi!
        if (!matchedDesa && namaKecamatan) {
          const kecQuery = await databases.listDocuments(DB_ID, 'master_desa', [
            Query.equal('kecamatan', namaKecamatan),
            Query.limit(50) // Ambil semua desa di kecamatan itu
          ]);

          let bestMatch = null;
          let minDistance = 999;

          // Fungsi sederhana untuk menghitung Jarak Levenshtein
          const levenshtein = (a, b) => {
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
            tahap_ke: "Rekomendasi Scanner", 
            nominal_pencairan_net: item.nominal,
            keterangan: item.kegiatan,
            status_verifikasi: "DRAFT",
            pagu: paguId,
            no_rekomendasi: no_surat || ''
          }
        );

        results.push(transaksi);
      } catch (err: any) {
        errors.push({ nama_desa: item.nama_desa, reason: err.message });
      }
    }

    return NextResponse.json({ 
      success: true, 
      saved: results.length, 
      failed: errors.length,
      errors 
    });

  } catch (error: any) {
    console.error('Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

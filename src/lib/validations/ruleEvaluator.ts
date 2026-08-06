import { Databases, Query } from 'node-appwrite';
import { logger } from '@/utils/logger';

export interface NormalizedRules {
  tahun_anggaran: number;
  addm_pct: number;
  addp_pct: number;
  limit_bulanan: number;
  min_alokasi_pajak_pct: number;
  max_reward_petugas_pct: number;
  iuran_pemda_pct: number;
  iuran_pribadi_pct: number;
  bulan_potongan: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  pasalRujukan: string[];
}

/**
 * Normalisasi data regulasi agar mendukung schema keluaran AI Gemini maupun schema Appwrite
 */
export function normalizeRules(rawRules: any): NormalizedRules {
  const addm_pct = rawRules.perbup_add?.addm_pct ?? rawRules.perbup_add?.addm_persentase ?? 0.70;
  const addp_pct = rawRules.perbup_add?.addp_pct ?? rawRules.perbup_add?.addp_persentase ?? 0.30;
  const limit_bulanan = rawRules.perbup_add?.limit_bulanan ?? rawRules.perbup_add?.limit_pencairan_bulanan ?? 0.08333;

  const min_alokasi_pajak_pct = rawRules.perbup_bhpr?.min_alokasi_pajak_pct ?? rawRules.perbup_bhpr?.min_alokasi_pajak_persentase ?? 0.20;
  const max_reward_petugas_pct = rawRules.perbup_bhpr?.max_reward_petugas_pct ?? rawRules.perbup_bhpr?.max_reward_petugas_persentase ?? 0.10;

  const iuran_pemda_pct = rawRules.bpjs?.iuran_pemda_pct ?? rawRules.bpjs?.iuran_pemda_persentase ?? 0.04;
  const iuran_pribadi_pct = rawRules.bpjs?.iuran_pribadi_pct ?? rawRules.bpjs?.iuran_pribadi_persentase ?? 0.01;
  const bulan_potongan = rawRules.bpjs?.bulan_potongan ?? rawRules.bpjs?.bulan_pemotongan_otomatis ?? 'Januari';

  return {
    tahun_anggaran: Number(rawRules.tahun_anggaran) || 2026,
    addm_pct,
    addp_pct,
    limit_bulanan,
    min_alokasi_pajak_pct,
    max_reward_petugas_pct,
    iuran_pemda_pct,
    iuran_pribadi_pct,
    bulan_potongan,
  };
}

// Sumber Dana Master IDs
const MASTER_SUMBER = {
  ADD: '6a64bfd90021763084f9',
  BKK_SARPRAS: '6a64bfd9002ec2d59217',
  DD_REGULER: '6a64bfd90038b1abff80',
  DD_INSENTIF: '6a64bfda000450764495',
  BHPR: '6a64bfda0009880010bb'
};

/**
 * Validasi transaksi keuangan desa terhadap aturan Perbup yang dinamis (Rules-as-Code)
 */
export async function validateTransaction(
  databases: Databases,
  dbId: string,
  transaction: {
    $id?: string;
    desa_id: string;
    jenis_dana: string;
    bulan_penyaluran: string;
    tahap_ke: string;
    nominal_pengajuan: number;
    potongan_bpjs: number;
  },
  rules: NormalizedRules
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pasalRujukan: string[] = [];

  const { desa_id, jenis_dana, bulan_penyaluran, tahap_ke, nominal_pengajuan, potongan_bpjs } = transaction;

  // Ambil nama desa & kecamatan untuk log
  let namaDesa = 'Desa';
  try {
    const desaDoc = await databases.getDocument(dbId, 'master_desa', desa_id);
    namaDesa = desaDoc.nama_desa;
  } catch (err) {
    logger.warn('RULE_EVALUATOR', `Gagal mengambil dokumen master_desa untuk id: ${desa_id}`);
  }

  // 1. Validasi Aturan ADD (Alokasi Dana Desa)
  if (jenis_dana === 'ADD') {
    // Cari pagu ADD desa berjalan
    let paguTotal = 0;
    try {
      const paguQuery = await databases.listDocuments(dbId, 'pagu_alokasi', [
        Query.equal('desa', desa_id),
        Query.equal('tahun_anggaran', rules.tahun_anggaran),
        Query.equal('sumber_dana', MASTER_SUMBER.ADD)
      ]);

      if (paguQuery.total > 0) {
        paguTotal = paguQuery.documents[0].total_pagu_bruto ?? paguQuery.documents[0].pagu_total ?? 0;
      } else {
        // Fallback: coba query tanpa pencocokan sumber_dana ID
        const paguFallback = await databases.listDocuments(dbId, 'pagu_alokasi', [
          Query.equal('desa', desa_id),
          Query.equal('tahun_anggaran', rules.tahun_anggaran)
        ]);
        if (paguFallback.total > 0) {
          paguTotal = paguFallback.documents[0].total_pagu_bruto ?? paguFallback.documents[0].pagu_total ?? 0;
        }
      }
    } catch (err) {
      logger.error('RULE_EVALUATOR', `Error mencari pagu alokasi desa: ${desa_id}`, err);
    }

    if (paguTotal === 0) {
      errors.push(`Pagu Alokasi ADD untuk desa ${namaDesa} belum di-setup di database untuk TA ${rules.tahun_anggaran}.`);
      return { valid: false, errors, warnings, pasalRujukan };
    }

    // A. Aturan Batas Pengajuan Bulanan (1/12 Pagu)
    const limitBulanan = paguTotal * rules.limit_bulanan;
    
    // Cari total transaksi ADD bulan ini yang sudah disetujui (atau draf, selain ditolak/milik transaksi ini sendiri)
    let cumulativeMonthSum = 0;
    try {
      const existingTrx = await databases.listDocuments(dbId, 'transaksi_pencairan', [
        Query.equal('desa_id', desa_id),
        Query.equal('bulan_penyaluran', bulan_penyaluran),
        Query.equal('jenis_dana', 'ADD'),
        Query.limit(100)
      ]);

      existingTrx.documents.forEach((doc) => {
        // Jangan jumlahkan transaksi berjalan atau transaksi yang DITOLAK
        if (doc.$id !== transaction.$id && doc.status_verifikasi !== 'DITOLAK' && doc.status !== 'DITOLAK') {
          cumulativeMonthSum += doc.nominal_pengajuan ?? 0;
        }
      });
    } catch (err) {
      logger.error('RULE_EVALUATOR', 'Gagal memindai kumulatif transaksi bulanan', err);
    }

    const totalProposed = cumulativeMonthSum + nominal_pengajuan;
    if (totalProposed > limitBulanan + 100) { // Toleransi Rp 100 untuk rounding
      errors.push(`Nominal pengajuan Rp ${nominal_pengajuan.toLocaleString('id-ID')} melanggar batas bulanan. Maksimal penyaluran per bulan adalah Rp ${Math.round(limitBulanan).toLocaleString('id-ID')} (1/12 pagu). Total terakumulasi bulan ini: Rp ${totalProposed.toLocaleString('id-ID')}.`);
      pasalRujukan.push('Pasal 21 Perbup ADD No. 1 Tahun 2026');
    }

    // B. Aturan Pemotongan Iuran BPJS Ketenagakerjaan / Kesehatan (Januari)
    const isBulanPotongan = bulan_penyaluran.toLowerCase().includes(rules.bulan_potongan.toLowerCase());
    const expectedBpjs = nominal_pengajuan * rules.iuran_pemda_pct;

    if (isBulanPotongan) {
      const diff = Math.abs(potongan_bpjs - expectedBpjs);
      if (diff > 100) { // Toleransi Rp 100 selisih pembulatan
        errors.push(`Potongan BPJS untuk bulan ${rules.bulan_potongan} tidak sesuai. Seharusnya dipotong sebesar 4% (Rp ${Math.round(expectedBpjs).toLocaleString('id-ID')}), namun terisi Rp ${potongan_bpjs.toLocaleString('id-ID')}.`);
        pasalRujukan.push(`Surat Tagihan BPJS Kesehatan / Regulasi Iuran Pemda`);
      }
    } else {
      if (potongan_bpjs > 0) {
        warnings.push(`Ditemukan potongan BPJS sebesar Rp ${potongan_bpjs.toLocaleString('id-ID')} pada bulan ${bulan_penyaluran}. BPJS umumnya hanya didealkan/dipotong otomatis pada bulan ${rules.bulan_potongan}.`);
      }
    }
  }

  // 2. Validasi Aturan BHPR (Bagi Hasil Pajak & Retribusi)
  if (jenis_dana === 'BHPR') {
    // Syarat Tahap II (40%): Setoran PBB-P2 Wajib 100% Lunas
    if (tahap_ke.toLowerCase().includes('tahap ii') || tahap_ke.toLowerCase().includes('tahap 2')) {
      try {
        const desaDoc = await databases.getDocument(dbId, 'master_desa', desa_id);
        const statusPbb = desaDoc.status_pbb_lunas;
        if (statusPbb !== true && statusPbb !== 'LUNAS') {
          errors.push(`Pencairan BHPR Tahap II untuk Desa ${namaDesa} ditunda karena setoran Pajak Bumi dan Bangunan (PBB-P2) desa belum lunas 100%.`);
          pasalRujukan.push('Pasal 8 Perbup No. 9 Tahun 2025 (Penyaluran Tahap II BHPR)');
        }
      } catch (err) {
        errors.push(`Tidak dapat memverifikasi status PBB-P2 untuk Desa ${namaDesa}. Pencairan ditunda.`);
        pasalRujukan.push('Pasal 8 Perbup No. 9 Tahun 2025');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    pasalRujukan
  };
}

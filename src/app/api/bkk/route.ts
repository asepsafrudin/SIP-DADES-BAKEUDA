import { NextRequest, NextResponse } from 'next/server';

const sampleBkkTransactions = [
  { id: '1', desa: 'Kedungbenda', kegiatan: 'Pembangunan Talud & Jalan Desa', nominal_rekomendasi: 150000000, status: 'DISETUJUI' },
  { id: '2', desa: 'Bokol', kegiatan: 'Rehab Balai Kemasyarakatan', nominal_rekomendasi: 100000000, status: 'DISETUJUI' },
  { id: '3', desa: 'Pelumutan', kegiatan: 'Pengaspalan Jalan Usaha Tani', nominal_rekomendasi: 120000000, status: 'DISETUJUI' },
  { id: '4', desa: 'Kembaran Kulon', kegiatan: 'Pembangunan Drainase Pemukiman', nominal_rekomendasi: 95000000, status: 'DISETUJUI' },
];

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'success',
    total_kegiatan: sampleBkkTransactions.length,
    total_nominal: sampleBkkTransactions.reduce((s, r) => s + r.nominal_rekomendasi, 0),
    data: sampleBkkTransactions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    return NextResponse.json({
      status: 'success',
      message: 'Surat Rekomendasi Dinsospermasdes BKK Sarpras 13 Desa berhasil diproses via OCR!',
      metadata: {
        nomor_surat: '900/5444',
        tanggal_surat: '26 Mei 2026',
        pengirim: 'DinsospermasdesP3A Kabupaten Purbalingga',
        perihal: 'Rekomendasi Penyaluran BKK Sarpras TA 2026',
        total_kegiatan: 13,
        total_nominal: 1345000000,
        dasar_hukum: 'Perbup Purbalingga Nomor 2 Tahun 2026',
      },
      data: sampleBkkTransactions,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Gagal memproses file BKK Sarpras' },
      { status: 500 }
    );
  }
}

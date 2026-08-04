import { NextRequest, NextResponse } from 'next/server';

// Mock BHPR Transactions state for operational demonstration
const sampleBhprTransactions = [
  { id: '1', desa: 'Krangean', kecamatan: 'Kertanegara', no_rek: '3122061417', pagu_total: 38370000, nominal_tahap_1: 27153000, status: 'DISETUJUI' },
  { id: '2', desa: 'Darma', kecamatan: 'Kertanegara', no_rek: '3122061387', pagu_total: 35472000, nominal_tahap_1: 25414200, status: 'DISETUJUI' },
  { id: '3', desa: 'Langkap', kecamatan: 'Kertanegara', no_rek: '3122061336', pagu_total: 36238000, nominal_tahap_1: 25873800, status: 'DISETUJUI' },
  { id: '4', desa: 'Adiarsa', kecamatan: 'Kertanegara', no_rek: '3122061361', pagu_total: 37609000, nominal_tahap_1: 26696400, status: 'DISETUJUI' },
  { id: '5', desa: 'Karangasem', kecamatan: 'Kertanegara', no_rek: '3122061328', pagu_total: 38678000, nominal_tahap_1: 27337800, status: 'DISETUJUI' },
  { id: '6', desa: 'Karangpucung', kecamatan: 'Kertanegara', no_rek: '3122061395', pagu_total: 38217000, nominal_tahap_1: 27061200, status: 'DISETUJUI' },
  { id: '7', desa: 'Condong', kecamatan: 'Kertanegara', no_rek: '3122061425', pagu_total: 35350000, nominal_tahap_1: 25341000, status: 'DISETUJUI' },
  { id: '8', desa: 'Kasih', kecamatan: 'Kertanegara', no_rek: '3122061409', pagu_total: 39514000, nominal_tahap_1: 27839400, status: 'DISETUJUI' },
  { id: '9', desa: 'Karangtengah', kecamatan: 'Kertanegara', no_rek: '3122061433', pagu_total: 39472000, nominal_tahap_1: 27814200, status: 'DISETUJUI' },
  { id: '10', desa: 'Kertanegara', kecamatan: 'Kertanegara', no_rek: '3122061352', pagu_total: 39543000, nominal_tahap_1: 29103000, status: 'DISETUJUI' },
  { id: '11', desa: 'Mergasana', kecamatan: 'Kertanegara', no_rek: '3122061379', pagu_total: 36779000, nominal_tahap_1: 26198400, status: 'DISETUJUI' },
];

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'success',
    total_desa: sampleBhprTransactions.length,
    total_nominal_tahap_1: sampleBhprTransactions.reduce((s, r) => s + r.nominal_tahap_1, 0),
    data: sampleBhprTransactions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    return NextResponse.json({
      status: 'success',
      message: 'Surat Pengantar Camat & Lampiran 11 Desa Kertanegara berhasil diproses via OCR!',
      metadata: {
        nomor_surat: '900/141',
        tanggal_surat: '7 Juli 2026',
        kecamatan: 'Kertanegara',
        perihal: 'Permohonan Pencairan BHPR Tahap I (60%)',
        total_desa: 11,
        total_nominal: 295832400,
        dasar_hukum: 'Perbup No. 5 Tahun 2026 jo Perbup No. 9 Tahun 2025',
      },
      data: sampleBhprTransactions,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Gagal memproses file BHPR' },
      { status: 500 }
    );
  }
}

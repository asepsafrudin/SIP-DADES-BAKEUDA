import { NextRequest, NextResponse } from 'next/server';

const sampleAddTransactions = [
  { id: '1', desa_id: 'Kedungbenda', bulan_penyaluran: 'Agustus 2026', jenis_dana: 'ADD', nominal_pengajuan: 373456000, potongan_bpjs: 14938240, nominal_net: 358517760, status: 'DISETUJUI' },
  { id: '2', desa_id: 'Bokol', bulan_penyaluran: 'Agustus 2026', jenis_dana: 'ADD', nominal_pengajuan: 307615000, potongan_bpjs: 12304600, nominal_net: 295310400, status: 'DISETUJUI' },
  { id: '3', desa_id: 'Pelumutan', bulan_penyaluran: 'Agustus 2026', jenis_dana: 'ADD', nominal_pengajuan: 367799000, potongan_bpjs: 14711960, nominal_net: 353087040, status: 'MENUNGGU_VERIFIKASI' },
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bulan = searchParams.get('bulan') || 'Agustus 2026';

  const filtered = sampleAddTransactions.filter(t => t.bulan_penyaluran === bulan || !t.bulan_penyaluran);

  return NextResponse.json({
    status: 'success',
    total: filtered.length,
    data: filtered.length > 0 ? filtered : sampleAddTransactions,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({
      status: 'success',
      message: 'Transaksi ADD berhasil dibuat/diperbarui.',
      data: body,
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Format data transaksi ADD tidak valid.' },
      { status: 400 }
    );
  }
}

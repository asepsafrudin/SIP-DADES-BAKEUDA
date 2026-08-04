import { NextRequest, NextResponse } from 'next/server';

// Mock active regulation parameters for Year 2026
const masterRegulasi2026 = {
  tahun_anggaran: 2026,
  perbup_add: {
    nomor: 'Perbup ADD No. 1 Tahun 2026',
    tanggal_pengesahan: '2 Januari 2026',
    addm_pct: 0.70, // 70% ADDM Merata
    addp_pct: 0.30, // 30% ADDP Proporsional
    limit_bulanan: 0.08333, // 1/12 pagu bulanan
  },
  perbup_bhpr: {
    nomor: 'Perbup No. 5 Tahun 2026',
    tanggal_pengesahan: '5 Januari 2026',
    min_alokasi_pajak_pct: 0.20, // 20% Min alokasi pajak
    max_reward_petugas_pct: 0.10, // 10% Max reward petugas
  },
  bpjs: {
    iuran_pemda_pct: 0.04, // 4% Pemda / ADD
    iuran_pribadi_pct: 0.01, // 1% Pribadi
    bulan_potongan: 'Januari',
  },
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tahun = searchParams.get('tahun') || '2026';

  return NextResponse.json({
    status: 'success',
    tahun_anggaran: Number(tahun),
    data: masterRegulasi2026,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tahun_sumber, tahun_target } = body;

    // Duplikasi regulasi antar tahun (contoh: 2026 -> 2027 saat transisi akhir tahun)
    return NextResponse.json({
      status: 'success',
      message: `Berhasil menduplikasi parameter regulasi dari TA ${tahun_sumber} ke TA ${tahun_target}.`,
      data: {
        ...masterRegulasi2026,
        tahun_anggaran: Number(tahun_target),
      },
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Gagal memproses duplikasi regulasi.' },
      { status: 400 }
    );
  }
}

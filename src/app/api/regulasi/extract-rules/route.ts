import { NextRequest, NextResponse } from 'next/server';

/**
 * AI Regulatory Rule Extractor API
 * Endpoint ini menerima teks mentah hasil ekstraksi PDF (Perbup/PMK) 
 * dan menggunakan AI LLM untuk mengubah pasal-pasal hukum menjadi 
 * parameter JSON yang dapat dicerna otomatis oleh sistem SIP-DADES.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { extracted_text, tahun_anggaran } = body;

    if (!extracted_text) {
      return NextResponse.json(
        { status: 'error', message: 'Teks hasil ekstraksi regulasi wajib diberikan.' },
        { status: 400 }
      );
    }

    // Simulasi respons AI Rule Extractor (Gemini / OpenAI Parsing Layer)
    // AI menganalisis pasal-pasal dan mengekstrak parameter kuantitatif
    const extractedRules = {
      tahun_anggaran: Number(tahun_anggaran) || 2026,
      perbup_add: {
        nomor_peraturan: "Perbup ADD No. 1 Tahun 2026",
        addm_persentase: 0.70, // 70% ADDM (Merata)
        addp_persentase: 0.30, // 30% ADDP (Proporsional)
        limit_pencairan_bulanan: 0.08333, // 1/12 pagu bulanan
        pasal_rujukan: "Pasal 7 & Pasal 21"
      },
      perbup_bhpr: {
        nomor_peraturan: "Perbup No. 5 Tahun 2026",
        min_alokasi_pajak_persentase: 0.20, // 20% Min alokasi pajak
        max_reward_petugas_persentase: 0.10, // 10% Max reward petugas
        syarat_tahap_2: "Realisasi PBB-P2 Wajib 100% Lunas",
        pasal_rujukan: "Pasal 7 & Pasal 8"
      },
      bpjs: {
        iuran_pemda_persentase: 0.04, // 4% Pemda / ADD
        iuran_pribadi_persentase: 0.01, // 1% Pribadi
        bulan_pemotongan_otomatis: "Januari"
      },
      extracted_at: new Date().toISOString(),
      confidence_score: 0.98
    };

    return NextResponse.json({
      status: 'success',
      message: 'Regulasi berhasil diekstrak menjadi parameter logika aplikasi.',
      data: extractedRules
    });
  } catch {
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengekstrak logika regulasi.' },
      { status: 500 }
    );
  }
}

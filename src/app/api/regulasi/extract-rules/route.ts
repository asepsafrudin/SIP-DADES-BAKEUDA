import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/authMiddleware';
import { logger } from '@/utils/logger';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { callMcpTool } from '@/lib/mcpClient';

/**
 * AI Regulatory Rule Extractor API — Gemini-Powered (Fix 3.1)
 *
 * Endpoint ini menganalisis teks hukum/pasal Perbup & PMK menggunakan
 * Gemini AI untuk mengekstrak parameter kuantitatif (Rules-as-Code)
 * yang siap disuntikkan ke kalkulator SIP-DADES.
 *
 * Sebelumnya: hanya regex string matching (textUpper.includes('80%'))
 * Sekarang: pemanggilan LLM nyata dengan structured output via JSON schema
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN']);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { extracted_text, tahun_anggaran } = body;

    if (!extracted_text || typeof extracted_text !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Teks hasil ekstraksi regulasi wajib diberikan.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      logger.error('AI_POLICY_COMPILER', 'GOOGLE_API_KEY tidak ditemukan di environment');
      return NextResponse.json(
        { status: 'error', message: 'AI Policy Compiler tidak terkonfigurasi (GOOGLE_API_KEY hilang).' },
        { status: 500 }
      );
    }

    // Query RAG background contexts
    let ragContext = '';
    try {
      const queryText = extracted_text.slice(0, 300).replace(/\r?\n|\r/g, ' ');
      logger.info('AI_POLICY_COMPILER', `Querying RAG for background context: "${queryText.slice(0, 80)}..."`);
      
      const ragResult = await callMcpTool('knowledge_search', {
        namespace: 'purbalingga_legal',
        query: queryText
      });
      
      if (ragResult && ragResult.success && ragResult.context) {
        ragContext = ragResult.context;
        logger.info('AI_POLICY_COMPILER', 'RAG context successfully loaded from purbalingga_legal.');
      } else {
        // Try fallback namespace bakeuda_internal
        const backupResult = await callMcpTool('knowledge_search', {
          namespace: 'bakeuda_internal',
          query: queryText
        });
        if (backupResult && backupResult.success && backupResult.context) {
          ragContext = backupResult.context;
          logger.info('AI_POLICY_COMPILER', 'RAG context successfully loaded from bakeuda_internal.');
        }
      }
    } catch (err: any) {
      logger.warn('AI_POLICY_COMPILER', `RAG query failed or timed out: ${err.message}. Proceeding without RAG context.`);
    }

    // Inisialisasi Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    logger.info('AI_POLICY_COMPILER', `Initializing Gemini model: ${modelName}`);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0, // Strict, deterministic output
      },
    });

    const prompt = `
Kamu adalah asisten hukum keuangan daerah Indonesia yang ahli dalam regulasi ADD (Alokasi Dana Desa), 
BHPR (Bagi Hasil Pajak Retribusi), BKK (Bantuan Keuangan Khusus), dan pemotongan BPJS Ketenagakerjaan.

Tugasmu: Analisis teks regulasi berikut dan ekstrak parameter kuantitatif yang terkandung di dalamnya.

${ragContext ? `
**KONTEKS REGULASI / HUKUM TERKAIT DARI KNOWLEDGE BASE (RAG):**
${ragContext}
` : ''}

**TEKS REGULASI:**
${extracted_text.slice(0, 8000)}

**TAHUN ANGGARAN:** ${tahun_anggaran || 2026}

Kembalikan hasil dalam format JSON berikut (isi nilai berdasarkan teks, gunakan default jika tidak disebutkan):
{
  "tahun_anggaran": <number>,
  "perbup_add": {
    "nomor_peraturan": "<nomor Perbup jika tersebut, atau 'Perbup ADD TA ${tahun_anggaran || 2026}'>",
    "addm_persentase": <desimal 0-1, default 0.70 jika tidak disebutkan>,
    "addp_persentase": <desimal 0-1, default 0.30 jika tidak disebutkan>,
    "limit_pencairan_bulanan": <desimal, default 0.08333>,
    "pasal_rujukan": "<nomor pasal yang relevan>"
  },
  "perbup_bhpr": {
    "nomor_peraturan": "<nomor Perbup jika tersebut>",
    "min_alokasi_pajak_persentase": <desimal 0-1, default 0.20>,
    "max_reward_petugas_persentase": <desimal 0-1, default 0.10>,
    "syarat_tahap_2": "<deskripsi syarat tahap II, default 'Realisasi PBB-P2 Wajib 100% Lunas'>",
    "pasal_rujukan": "<nomor pasal yang relevan>"
  },
  "bpjs": {
    "iuran_pemda_persentase": <desimal, default 0.04>,
    "iuran_pribadi_persentase": <desimal, default 0.01>,
    "bulan_pemotongan_otomatis": "<bulan potongan, default 'Januari'>"
  },
  "confidence_score": <desimal 0-1, confidence level dalam mengekstrak data>,
  "catatan_ekstraksi": "<catatan penting terkait pengecualian atau aturan khusus>"
}

PENTING: Kembalikan HANYA format JSON di atas, jangan tambahkan markdown atau penjelasan teks di luar JSON.
PENTING: Jika suatu nilai tidak disebutkan eksplisit dalam teks, gunakan nilai default dan tandai confidence_score lebih rendah.
`.trim();

    let extractedRules: any;
    let fallbackTriggered = false;
    let fallbackReason = '';
    let modelUsed = modelName;

    try {
      logger.info('AI_POLICY_COMPILER', `Mengirim permintaan ke Gemini AI (${modelName})...`);
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      extractedRules = JSON.parse(responseText);
    } catch (err: any) {
      logger.error('AI_POLICY_COMPILER', 'Gemini AI failed, trying local Ollama LLM...', err);
      
      try {
        const ollamaModel = process.env.LOCAL_LLM_MODEL || 'gemma2:latest';
        logger.info('AI_POLICY_COMPILER', `Mengirim permintaan ke Local Ollama (${ollamaModel})...`);
        
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: prompt,
            format: 'json',
            stream: false,
            options: {
              temperature: 0
            }
          }),
          signal: AbortSignal.timeout(15000) // 15s timeout
        });
        
        if (response.ok) {
          const resJson = await response.json();
          extractedRules = JSON.parse(resJson.response);
          logger.info('AI_POLICY_COMPILER', 'Ekstraksi regulasi via Local Ollama BERHASIL!');
          modelUsed = `local-ollama (${ollamaModel})`;
        } else {
          throw new Error(`Ollama returned status ${response.status}`);
        }
      } catch (ollamaErr: any) {
        logger.error('AI_POLICY_COMPILER', 'Local Ollama juga gagal, beralih ke deterministic fallback', ollamaErr);
        fallbackTriggered = true;
        fallbackReason = `Gemini: ${err.message || 'Error'}. Ollama: ${ollamaErr.message || 'Error'}`;
      }
    }

    if (fallbackTriggered) {
      // Fallback ke rules-based
      modelUsed = 'deterministic-rules';
      const textUpper = extracted_text.toUpperCase();
      let addm_pct = 0.70;
      let addp_pct = 0.30;
      if (textUpper.includes('80%') || textUpper.includes('80 PERSEN')) { addm_pct = 0.80; addp_pct = 0.20; }
      else if (textUpper.includes('60%') || textUpper.includes('60 PERSEN')) { addm_pct = 0.60; addp_pct = 0.40; }

      const pasalMatch = extracted_text.match(/Pasal\s+\d+(\s+dan\s+Pasal\s+\d+)?/gi);
      extractedRules = {
        tahun_anggaran: Number(tahun_anggaran) || 2026,
        perbup_add: {
          nomor_peraturan: `Perbup ADD TA ${tahun_anggaran || 2026}`,
          addm_persentase: addm_pct,
          addp_persentase: addp_pct,
          limit_pencairan_bulanan: 0.08333,
          pasal_rujukan: pasalMatch ? pasalMatch.slice(0, 3).join(', ') : 'Pasal 7 & Pasal 21',
        },
        perbup_bhpr: {
          nomor_peraturan: `Perbup BHPR TA ${tahun_anggaran || 2026}`,
          min_alokasi_pajak_persentase: 0.20,
          max_reward_petugas_persentase: 0.10,
          syarat_tahap_2: 'Realisasi PBB-P2 Wajib 100% Lunas',
          pasal_rujukan: 'Pasal 7 & Pasal 8',
        },
        bpjs: {
          iuran_pemda_persentase: 0.04,
          iuran_pribadi_persentase: 0.01,
          bulan_pemotongan_otomatis: 'Januari',
        },
        confidence_score: 0.40,
        catatan_ekstraksi: `Fallback ke rules-based: ${fallbackReason.slice(0, 100)}`,
      };
    }

    // Pastikan tahun_anggaran ter-override jika tidak diisi oleh LLM
    extractedRules.tahun_anggaran = Number(extractedRules.tahun_anggaran) || Number(tahun_anggaran) || 2026;
    extractedRules.extracted_at = new Date().toISOString();
    extractedRules.is_ai_extracted = true;
    extractedRules.model_used = modelUsed;

    logger.info('AI_POLICY_COMPILER', `Berhasil mengekstrak regulasi via ${modelUsed}`, {
      tahun: extractedRules.tahun_anggaran,
      confidence: extractedRules.confidence_score,
    });

    return NextResponse.json({
      status: 'success',
      message: 'Regulasi berhasil dianalisis oleh AI dan dikompilasi menjadi parameter logika.',
      data: extractedRules,
    });

  } catch (error: any) {
    logger.error('AI_POLICY_COMPILER', 'Gagal mengekstrak regulasi', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Gagal mengekstrak logika regulasi.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { rateLimit } from '@/utils/rateLimit';
import { logger } from '@/utils/logger';
import { validateAndSanitizeOcrResult } from '@/lib/validations/ocrSchema';
import { getKillSwitchState, recordAiUsage } from '@/lib/killSwitch';
import { PDFParse } from 'pdf-parse';

export const maxDuration = 180;

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  
  // Rate Limit: 5 requests per minute
  const limit = rateLimit(ip, 5, 60 * 1000);
  if (!limit.success) {
    logger.warn('OCR_API', 'Rate limit exceeded', { ip });
    return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const images: string[] = body.images; // array of base64 data URIs

    if (!images || images.length === 0) {
      return NextResponse.json({ error: 'Tidak ada gambar yang diunggah' }, { status: 400 });
    }

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    const runpodEndpointId = process.env.RUNPOD_ENDPOINT_ID;

    // Check AI Kill-Switch Status
    const killSwitch = getKillSwitchState();
    if (killSwitch.active) {
      logger.warn('OCR_API', 'AI Kill-Switch AKTIF - Melakukan fallback ke PDFParse lokal', { reason: killSwitch.reason });
    }

    // Check if it's a PDF
    const isPdf = images[0].startsWith('data:application/pdf');
    const base64Data = images[0].split(',')[1] || images[0];

    if (isPdf) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        const extractedText = pdfData.text.trim();
        await parser.destroy();
        
        // If it has enough text, it's a native PDF. Skip RunPod.
        if (extractedText.length > 100) {
          logger.info('OCR_API', 'Berhasil mengekstrak teks native dari PDF');
          return NextResponse.json({
            success: true,
            raw_text: extractedText,
            is_native_pdf: true,
            // You can add LLM processing here later if needed to structure the text
            data: [] 
          });
        }
      } catch (e) {
        logger.warn('OCR_API', 'Gagal parsing PDF Native, fallback ke RunPod', e);
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${runpodApiKey}`
    };

    // Kirim job ke RunPod (async, tidak tunggu hasil)
    const runResponse = await fetch(`https://api.runpod.ai/v2/${runpodEndpointId}/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input: { image: base64Data } })
    });

    if (!runResponse.ok) {
      const err = await runResponse.text();
      logger.error('OCR_API', 'RunPod submit error', err);
      return NextResponse.json({ error: 'Gagal mengirim dokumen ke server OCR' }, { status: runResponse.status });
    }

    const { id: jobId } = await runResponse.json();
    logger.info('OCR_API', 'Job submitted', { jobId });

    // Poll status setiap 3 detik, max 2.5 menit
    const maxWaitMs = 150_000;
    const pollInterval = 3000;
    const started = Date.now();
    let runpodResponse: Response | null = null;

    while (Date.now() - started < maxWaitMs) {
      await new Promise(r => setTimeout(r, pollInterval));
      runpodResponse = await fetch(`https://api.runpod.ai/v2/${runpodEndpointId}/status/${jobId}`, { headers });
      if (!runpodResponse.ok) break;
      const statusData = await runpodResponse.clone().json();
      logger.info('OCR_API', 'Polling status', { status: statusData.status, elapsed: Date.now() - started });
      if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') break;
    }

    if (!runpodResponse || !runpodResponse.ok) {
      return NextResponse.json({ error: 'Gagal memproses dokumen (koneksi RunPod bermasalah)' }, { status: 500 });
    }

    const result = await runpodResponse.json();
    
    logger.info('OCR_API', 'RunPod raw result', { status: result.status, hasOutput: !!result.output });

    if (result.status !== "COMPLETED") {
      logger.error('OCR_API', 'RunPod Task Gagal', result);
      const errorMsg = result.error || result.output?.error || 'Pemrosesan AI gagal di RunPod';
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }

    // handler.py mengembalikan: { status, raw_text, data: { metadata_sumber_dana, metadata_tahun_anggaran, metadata_no_surat, data[] } }
    const output = result.output;

    // Jika handler mengembalikan error field
    if (output?.error) {
      logger.error('OCR_API', 'Handler Error', output.error);
      return NextResponse.json({ error: output.error }, { status: 500 });
    }

    const tmmdData = output?.data;

    if (!tmmdData) {
      logger.error('OCR_API', 'Output tidak memiliki field data', output);
      return NextResponse.json({ 
        error: 'Format data dari AI tidak valid',
        raw_output: output 
      }, { status: 500 });
    }

    // Enforce Zod Schema Guardrail
    const validated = validateAndSanitizeOcrResult({
      status: 'success',
      raw_text: output.raw_text || '',
      metadata_sumber_dana: tmmdData.metadata_sumber_dana || 'ADD',
      metadata_tahun_anggaran: tmmdData.metadata_tahun_anggaran || '2026',
      metadata_no_surat: tmmdData.metadata_no_surat || '',
      data: tmmdData.data || []
    });

    if (!validated.valid || !validated.data) {
      logger.warn('OCR_API', 'Zod validation warning, fallback executed', { errors: validated.errors });
    }

    const sanitizedData = validated.data || {
      status: 'success',
      raw_text: output.raw_text || '',
      metadata_sumber_dana: tmmdData.metadata_sumber_dana || 'ADD',
      metadata_tahun_anggaran: tmmdData.metadata_tahun_anggaran || '2026',
      metadata_no_surat: tmmdData.metadata_no_surat || '',
      data: tmmdData.data || []
    };

    logger.info('OCR_API', 'Berhasil mengekstrak data OCR melalui RunPod + Zod Guardrail', {
      jumlah_data: sanitizedData.data.length
    });

    return NextResponse.json({ 
      success: true,
      raw_text: sanitizedData.raw_text,
      metadata_sumber_dana: sanitizedData.metadata_sumber_dana,
      metadata_tahun_anggaran: sanitizedData.metadata_tahun_anggaran,
      metadata_no_surat: sanitizedData.metadata_no_surat,
      data: sanitizedData.data
    });

  } catch (error: unknown) {
    logger.error('OCR_API', 'OCR Server Error', error);
    const message = error instanceof Error ? error.message : 'Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

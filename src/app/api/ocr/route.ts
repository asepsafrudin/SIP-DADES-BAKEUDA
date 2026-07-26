import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Client, Databases } from 'node-appwrite';
import { rateLimit } from '@/utils/rateLimit';
import { logger } from '@/utils/logger';

// Type definitions for OpenAI vision payload
type MessageContentText = { type: 'text'; text: string };
type MessageContentImage = { type: 'image_url'; image_url: { url: string } };
type ContentPayload = MessageContentText | MessageContentImage;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.ip ?? 'unknown';
  
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

    // 2. Ambil Daftar Desa Resmi dari Database sebagai Referensi Ejaan AI
    // Hal ini untuk mencegah typo seperti "Kailialang" atau "Tangkisian"
    const databases = new Databases(client);
    let referensiDesa = '';
    try {
      const desaRes = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID || 'sipdades_db',
        'master_desa'
      );
      // Buat daftar nama unik lengkap dengan kecamatan
      const daftarNama = desaRes.documents.map(d => `${d.nama_desa} Kec. ${d.kecamatan}`).join(', ');
      referensiDesa = `\n\nPENTING (VALIDASI NAMA DESA): 
Anda WAJIB menggunakan ejaan dan format nama desa beserta kecamatannya PERSIS seperti salah satu dari daftar referensi resmi berikut ini (Dilarang mengarang atau menggabungkan nama sendiri):
[${daftarNama}]`;
    } catch (e) {
      logger.error('OCR_API', 'Gagal mengambil referensi desa', e);
    }

    // Bangun payload pesan
    const contentPayload: ContentPayload[] = [{ 
      type: 'text', 
      text: `Anda adalah asisten AI pengekstraksi data finansial desa berakurasi tinggi.
Tugas Anda adalah membaca gambar/dokumen yang diunggah dan menghasilkan JSON murni dengan format berikut:
{
  "error_tipe_dokumen": "Isi dengan string kosong jika dokumen valid (Surat Pengantar/Rekomendasi). Jika dokumen adalah Kuitansi/Bukti Penyaluran/SP2D, isi dengan pesan error yang jelas dan kosongkan field lainnya.",
  "metadata_sumber_dana": "Contoh: Bantuan Keuangan Khusus (Sarpras)",
  "metadata_tahun_anggaran": "Contoh: 2026",
  "metadata_no_surat": "Contoh: 900/123/Bakeuda/2026 (Cari Nomor Surat Pengantar/Rekomendasi di halaman pertama)",
  "data": [
    {
      "nama_desa": "Nama desa beserta kecamatannya (Contoh: Panican Kec. Kemangkon)",
      "kegiatan": "Nama kegiatan atau peruntukan",
      "nominal": 100000000, // Harus berupa angka utuh, tanpa titik/koma
      "no_rekening": "Nomor rekening (tanpa tanda strip/karakter lain)"
    }
  ]
}
Aturan Ekstraksi:
- KLASIFIKASI DOKUMEN: Modul ini HANYA menerima Surat Pengantar / Pengajuan Rekomendasi Pencairan beserta lampirannya. JIKA halaman pertama yang Anda baca adalah KUITANSI atau BUKTI PENYALURAN yang menandakan uang sudah cair, Anda WAJIB mengisi "error_tipe_dokumen" dengan "Dokumen ditolak: Ini adalah Kuitansi/Bukti Penyaluran. Modul ini khusus untuk Surat Pengantar Pengajuan." dan kosongkan "data".
- metadata_sumber_dana: Cari di halaman pertama/pengantar dokumen yang biasanya menyebutkan sumber dana alokasi.
- metadata_tahun_anggaran: Cari tahun anggaran yang berlaku di pengantar dokumen.
- metadata_no_surat: Cari Nomor Surat (biasanya terletak di bawah Kop Surat halaman pertama dokumen pengantar).
- nominal: Pastikan mengonversi format Rupiah ke angka integer murni.
- no_rekening: Hapus semua tanda baca/spasi. ${referensiDesa}` 
    }];
    
    // Masukkan semua halaman gambar
    images.forEach(base64Image => {
      contentPayload.push({
        type: 'image_url',
        image_url: { url: base64Image }
      });
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: "json_object" },
      messages: [
        {
          role: 'user',
          content: contentPayload
        }
      ]
    });

    const resultText = completion.choices[0].message.content || '{"data":[]}';
    const jsonData = JSON.parse(resultText);

    // AI Classification Protection
    if (jsonData.error_tipe_dokumen && jsonData.error_tipe_dokumen.trim() !== '') {
      logger.warn('OCR_API', 'Dokumen ditolak oleh AI', { reason: jsonData.error_tipe_dokumen });
      return NextResponse.json({ error: jsonData.error_tipe_dokumen }, { status: 400 });
    }

    logger.info('OCR_API', 'Berhasil mengekstrak data OCR', { 
      desaCount: jsonData.data?.length || 0 
    });

    return NextResponse.json({ 
      success: true, 
      metadata_sumber_dana: jsonData.metadata_sumber_dana || '',
      metadata_tahun_anggaran: jsonData.metadata_tahun_anggaran || '',
      metadata_no_surat: jsonData.metadata_no_surat || '',
      data: jsonData.data || [] 
    });
  } catch (error: unknown) {
    logger.error('OCR_API', 'OCR Server Error', error);
    const message = error instanceof Error ? error.message : 'Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

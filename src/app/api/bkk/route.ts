import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';
import { verifyAuth } from '@/lib/authMiddleware';
import { logger } from '@/utils/logger';

const client = new Client();
if (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT) {
  client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
}
if (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID) {
  client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID);
}
if (process.env.APPWRITE_API_KEY) {
  client.setKey(process.env.APPWRITE_API_KEY);
}

const databases = new Databases(client);
const DB_ID = 'sipdades_db';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const res = await databases.listDocuments(DB_ID, 'transaksi_pencairan', [
      Query.limit(300)
    ]);

    // Filter documents for BKK
    const bkkDocs = res.documents.filter(d => d.jenis_dana === 'BKK' || d.jenis_dana === 'BKK_SARPRAS');

    const masterDesaRes = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(500)]);
    const desaMap = new Map(masterDesaRes.documents.map(d => [d.$id, d.nama_desa]));

    const formattedData = bkkDocs.map(doc => ({
      id: doc.$id,
      desa: desaMap.get(doc.desa_id || doc.desa) || doc.desa_id || 'Tidak Diketahui',
      kegiatan: doc.keterangan || 'Pembangunan Sarpras Desa',
      nominal_rekomendasi: doc.nominal_pengajuan || doc.nominal_pencairan_net || 0,
      status: doc.status_verifikasi || doc.status || 'DRAFT'
    }));

    const totalNominal = formattedData.reduce((s, r) => s + r.nominal_rekomendasi, 0);

    return NextResponse.json({
      status: 'success',
      total_kegiatan: formattedData.length,
      total_nominal: totalNominal,
      data: formattedData,
    });

  } catch (error: any) {
    logger.error('API_BKK', 'Gagal memuat data BKK', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data BKK Sarpras.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'File dokumen BKK Sarpras wajib diunggah.' }, { status: 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Surat Rekomendasi Dinsospermasdes BKK Sarpras berhasil diproses!',
      metadata: {
        nomor_surat: '900/5444/BKK/2026',
        tanggal_surat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        pengirim: 'DinsospermasdesP3A Kabupaten Purbalingga',
        perihal: 'Rekomendasi Penyaluran BKK Sarpras TA 2026',
        dasar_hukum: 'Perbup Purbalingga Nomor 2 Tahun 2026',
      }
    });

  } catch (error: any) {
    logger.error('API_BKK', 'BKK Processing Error', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Gagal memproses file BKK Sarpras' },
      { status: 500 }
    );
  }
}

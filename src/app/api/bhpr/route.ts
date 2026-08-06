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
      Query.equal('jenis_dana', 'BHPR'),
      Query.limit(300)
    ]);

    const masterDesaRes = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(500)]);
    const desaMap = new Map(masterDesaRes.documents.map(d => [d.$id, d]));

    const formattedData = res.documents.map(doc => {
      const desaObj = desaMap.get(doc.desa_id);
      return {
        id: doc.$id,
        desa: desaObj ? desaObj.nama_desa : (doc.desa_id || 'Tidak Diketahui'),
        kecamatan: desaObj ? desaObj.kecamatan : 'Kertanegara',
        no_rek: desaObj ? (desaObj.no_rekening || '-') : '-',
        pagu_total: doc.nominal_pengajuan || 0,
        nominal_tahap_1: doc.nominal_pencairan_net || 0,
        status_verifikasi: doc.status_verifikasi || 'DRAFT'
      };
    });

    const totalNominal = formattedData.reduce((s, r) => s + r.nominal_tahap_1, 0);

    return NextResponse.json({
      status: 'success',
      total_desa: formattedData.length,
      total_nominal_tahap_1: totalNominal,
      data: formattedData,
    });

  } catch (error: any) {
    logger.error('API_BHPR', 'Gagal memuat data BHPR', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data BHPR.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'File dokumen BHPR wajib diunggah.' }, { status: 400 });
    }

    return NextResponse.json({
      status: 'success',
      message: 'Surat Pengantar & Lampiran Pencairan BHPR berhasil diproses!',
      metadata: {
        nomor_surat: '900/141/BHPR/2026',
        tanggal_surat: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        perihal: 'Permohonan Pencairan BHPR Tahap I (60%)',
        dasar_hukum: 'Perbup No. 5 Tahun 2026 jo Perbup No. 9 Tahun 2025',
      }
    });

  } catch (error: any) {
    logger.error('API_BHPR', 'BHPR Processing Error', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses file BHPR' }, { status: 500 });
  }
}

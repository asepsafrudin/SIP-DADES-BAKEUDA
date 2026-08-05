import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';
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
    const searchParams = request.nextUrl.searchParams;
    const bulan = searchParams.get('bulan');

    const queries = [Query.equal('jenis_dana', 'ADD'), Query.limit(300)];
    if (bulan) {
      queries.push(Query.equal('bulan_penyaluran', bulan));
    }

    const res = await databases.listDocuments(DB_ID, 'transaksi_pencairan', queries);

    const masterDesaRes = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(500)]);
    const desaMap = new Map(masterDesaRes.documents.map(d => [d.$id, d.nama_desa]));

    const formattedData = res.documents.map(doc => ({
      id: doc.$id,
      desa_id: desaMap.get(doc.desa_id || doc.desa) || doc.desa_id || 'Tidak Diketahui',
      bulan_penyaluran: doc.bulan_penyaluran || 'Agustus 2026',
      jenis_dana: doc.jenis_dana,
      nominal_pengajuan: doc.nominal_pengajuan || 0,
      potongan_bpjs: doc.potongan_bpjs || 0,
      nominal_net: doc.nominal_pencairan_net || doc.nominal_net || 0,
      status: doc.status_verifikasi || doc.status || 'DRAFT',
      no_rekomendasi: doc.no_rekomendasi || ''
    }));

    return NextResponse.json({
      status: 'success',
      total: formattedData.length,
      data: formattedData,
    });

  } catch (error: any) {
    logger.error('API_ADD', 'Gagal memuat transaksi ADD', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat transaksi ADD dari database.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { desa_id, bulan_penyaluran, nominal_pengajuan, potongan_bpjs, keterangan, no_rekomendasi } = body;

    if (!desa_id || !nominal_pengajuan) {
      return NextResponse.json({ error: 'Desa dan nominal pengajuan wajib diisi.' }, { status: 400 });
    }

    const netNominal = (Number(nominal_pengajuan) || 0) - (Number(potongan_bpjs) || 0);

    const createdDoc = await databases.createDocument(DB_ID, 'transaksi_pencairan', ID.unique(), {
      desa_id,
      jenis_dana: 'ADD',
      bulan_penyaluran: bulan_penyaluran || 'Agustus 2026',
      nominal_pengajuan: Number(nominal_pengajuan),
      potongan_bpjs: Number(potongan_bpjs) || 0,
      nominal_net: netNominal,
      nominal_pencairan_net: netNominal,
      keterangan: keterangan || 'Penyaluran ADD Bulanan',
      no_rekomendasi: no_rekomendasi || '',
      status: 'DRAFT',
      status_verifikasi: 'DRAFT'
    });

    return NextResponse.json({
      status: 'success',
      message: 'Transaksi ADD berhasil disimpan ke Appwrite.',
      data: createdDoc,
    });
  } catch (error: any) {
    logger.error('API_ADD', 'Gagal membuat transaksi ADD', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Gagal memproses transaksi ADD.' },
      { status: 500 }
    );
  }
}

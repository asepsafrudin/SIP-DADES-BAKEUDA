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

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const transRes = await databases.listDocuments(DB_ID, 'transaksi_pencairan', [
      Query.orderDesc('$createdAt'),
      Query.limit(100)
    ]);

    // Filter DRAFT documents (support status_verifikasi or status field)
    const draftDocs = transRes.documents.filter(
      d => d.status_verifikasi === 'DRAFT' || d.status === 'DRAFT'
    );

    const masterDesaRes = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(500)]);
    const desaMap = new Map(masterDesaRes.documents.map(d => [d.$id, d]));

    const kuitansiList = [];

    for (const doc of draftDocs) {
      try {
        let desaDoc = null;
        let tahunAnggaran = '2026';

        // Direct desa reference
        const desaKey = doc.desa_id || doc.desa;
        if (desaKey && desaMap.has(desaKey)) {
          desaDoc = desaMap.get(desaKey);
        }

        // Pagu lookup
        const paguKey = typeof doc.pagu === 'object' ? doc.pagu.$id : (doc.pagu || doc.pagu_id);
        if (paguKey) {
          try {
            const paguDoc = await databases.getDocument(DB_ID, 'pagu_alokasi', paguKey);
            if (paguDoc) {
              tahunAnggaran = String(paguDoc.tahun_anggaran || '2026');
              if (!desaDoc) {
                const desaFromPagu = typeof paguDoc.desa === 'object' ? paguDoc.desa.$id : (paguDoc.desa || paguDoc.desa_id);
                if (desaFromPagu && desaMap.has(desaFromPagu)) {
                  desaDoc = desaMap.get(desaFromPagu);
                }
              }
            }
          } catch {
            // Pagu doc fetch fallback
          }
        }

        kuitansiList.push({
          id: doc.$id,
          namaDesa: desaDoc ? desaDoc.nama_desa : 'Kedungbenda',
          kecamatan: desaDoc ? desaDoc.kecamatan : 'Kemangkon',
          nominal: doc.nominal_pencairan_net || doc.nominal_net || doc.nominal_pengajuan || 0,
          keterangan: doc.keterangan || 'Penyaluran Alokasi Dana Desa (ADD)',
          tahun: tahunAnggaran,
          noRekening: desaDoc ? (desaDoc.no_rekening || '00000000') : '00000000',
          noRekomendasi: doc.no_rekomendasi || ''
        });
      } catch (e) {
        logger.warn('API_KUITANSI', `Error joining doc ${doc.$id}`, e);
      }
    }

    return NextResponse.json({ success: true, data: kuitansiList });

  } catch (error: any) {
    logger.error('API_KUITANSI', 'Kuitansi API Error', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat kuitansi DRAFT' }, { status: 500 });
  }
}

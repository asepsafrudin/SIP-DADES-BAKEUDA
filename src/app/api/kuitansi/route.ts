import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query } from 'node-appwrite';

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
  try {
    // Ambil transaksi DRAFT
    const transRes = await databases.listDocuments(DB_ID, 'transaksi_pencairan', [
      Query.equal('status_verifikasi', 'DRAFT'),
      Query.orderDesc('$createdAt'),
      Query.limit(50)
    ]);

    const kuitansiList = [];

    // Join manual karena kita menggunakan referensi string/id
    for (const doc of transRes.documents) {
      try {
        const paguId = typeof doc.pagu === 'object' ? doc.pagu.$id : doc.pagu;
        
        // Fetch pagu
        const paguDoc = await databases.getDocument(DB_ID, 'pagu_alokasi', paguId);
        const desaId = typeof paguDoc.desa === 'object' ? paguDoc.desa.$id : paguDoc.desa;
        
        // Fetch desa
        const desaDoc = await databases.getDocument(DB_ID, 'master_desa', desaId);

        kuitansiList.push({
          id: doc.$id,
          namaDesa: desaDoc.nama_desa,
          kecamatan: desaDoc.kecamatan,
          nominal: doc.nominal_pencairan_net,
          keterangan: doc.keterangan,
          tahun: paguDoc.tahun_anggaran,
          noRekening: desaDoc.no_rekening || '00000000',
          noRekomendasi: doc.no_rekomendasi
        });
      } catch (e) {
        console.error('Error joining data for doc', doc.$id, e);
      }
    }

    return NextResponse.json({ success: true, data: kuitansiList });

  } catch (error: any) {
    console.error('Kuitansi API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

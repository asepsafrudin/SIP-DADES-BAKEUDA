import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'IDs tidak valid' }, { status: 400 });
    }

    // Update status_verifikasi menjadi "DICETAK"
    const updatePromises = ids.map(id => 
      databases.updateDocument(DB_ID, 'transaksi_pencairan', id, {
        status_verifikasi: 'DICETAK'
      })
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: `${ids.length} transaksi telah diubah statusnya menjadi DICETAK.` });
  } catch (error: any) {
    console.error('Kuitansi Print API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

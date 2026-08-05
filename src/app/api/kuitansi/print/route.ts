import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
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

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'IDs tidak valid' }, { status: 400 });
    }

    const updatePromises = ids.map(id => 
      databases.updateDocument(DB_ID, 'transaksi_pencairan', id, {
        status: 'DICETAK',
        status_verifikasi: 'DICETAK'
      })
    );

    await Promise.all(updatePromises);

    logger.info('KUITANSI_PRINT_API', `Status ${ids.length} transaksi diubah menjadi DICETAK`, { ids });

    return NextResponse.json({ success: true, message: `${ids.length} transaksi telah diubah statusnya menjadi DICETAK.` });
  } catch (error: any) {
    logger.error('KUITANSI_PRINT_API', 'Kuitansi Print API Error', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui status kuitansi.' }, { status: 500 });
  }
}

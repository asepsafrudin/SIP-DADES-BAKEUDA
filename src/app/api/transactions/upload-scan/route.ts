import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases } from 'node-appwrite';
import { verifyAuth } from '@/lib/authMiddleware';
import { uploadScanDocument } from '@/lib/storageClient';
import { logger } from '@/utils/logger';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';
const TRANSAKSI_COL = 'transaksi_pencairan';

export async function POST(request: NextRequest) {
  // Auth Guard: Only BAKEUDA or SUPER_ADMIN can upload scan and approve
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const formData = await request.formData();
    const transactionId = formData.get('transaction_id') as string;
    const file = formData.get('file') as File | null;

    if (!transactionId || !file) {
      return NextResponse.json({ error: 'transaction_id dan file wajib dikirim.' }, { status: 400 });
    }

    // Convert file to Buffer for Appwrite SDK
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Upload file to Appwrite storage
    const uploadResult = await uploadScanDocument(buffer, file.name, file.type);
    logger.info('TRANSACTIONS_UPLOAD', `File uploaded to Appwrite Storage: ${uploadResult.fileId}`);

    // 2. Update transaction status and file_kuitansi_id in Appwrite database
    const currentDoc = await databases.getDocument(DB_ID, TRANSAKSI_COL, transactionId);
    
    await databases.updateDocument(DB_ID, TRANSAKSI_COL, transactionId, {
      status_verifikasi: 'CAIR',
      status: 'CAIR',
      file_kuitansi_id: uploadResult.fileId,
      nominal_pencairan_net: currentDoc.nominal_net // Cair net is equal to nominal net on completion
    });

    logger.info('TRANSACTIONS_UPLOAD', `Transaction ${transactionId} status updated to CAIR.`);

    return NextResponse.json({
      status: 'success',
      message: 'Dokumen scan TTE basah berhasil diunggah dan diverifikasi! Status pencairan diaktifkan.',
      fileUrl: uploadResult.fileUrl
    });

  } catch (err: any) {
    logger.error('TRANSACTIONS_UPLOAD_ERROR', 'Failed to ingest printed document', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

import { Client, Storage, ID } from 'node-appwrite';
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

const storage = new Storage(client);
export const BUCKET_KUITANSI = 'kuitansi_storage';

export async function ensureStorageBucket() {
  try {
    await storage.getBucket(BUCKET_KUITANSI);
    logger.info('STORAGE_CLIENT', `Bucket ${BUCKET_KUITANSI} active`);
  } catch (error: any) {
    if (error.code === 404) {
      try {
        await storage.createBucket(
          BUCKET_KUITANSI,
          'Kuitansi & Document Scan Storage',
          ['read("any")']
        );
        logger.info('STORAGE_CLIENT', `Bucket ${BUCKET_KUITANSI} created`);
      } catch (err) {
        logger.warn('STORAGE_CLIENT', `Bucket creation skipped/handled`, err);
      }
    }
  }
}

import { InputFile } from 'node-appwrite/file';

export async function uploadScanDocument(fileBuffer: Buffer, fileName: string, mimeType: string = 'application/pdf'): Promise<{ fileId: string; fileUrl: string }> {
  await ensureStorageBucket();

  const fileObj = InputFile.fromBuffer(fileBuffer, fileName);
  const result = await storage.createFile(BUCKET_KUITANSI, ID.unique(), fileObj);
  
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '';
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '';
  const fileUrl = `${endpoint}/storage/buckets/${BUCKET_KUITANSI}/files/${result.$id}/view?project=${projectId}`;

  logger.info('STORAGE_CLIENT', `Uploaded scan document ${fileName}`, { fileId: result.$id });
  return { fileId: result.$id, fileUrl };
}

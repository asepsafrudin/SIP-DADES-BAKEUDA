import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';
import { verifyAuth } from '@/lib/authMiddleware';
import { logger } from '@/utils/logger';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';
const REGULASI_COL = 'master_regulasi';
const AUDIT_LOG_COL = 'audit_log_regulasi';

export async function GET(request: NextRequest) {
  // Auth Guard: Only BAKEUDA or SUPER_ADMIN can manage regulatory approvals
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const list = await databases.listDocuments(DB_ID, REGULASI_COL, [
      Query.orderDesc('tahun_anggaran'),
      Query.limit(100)
    ]);

    return NextResponse.json({
      status: 'success',
      total: list.total,
      data: list.documents
    });
  } catch (err: any) {
    logger.error('REGULASI_APPROVAL_GET', 'Failed to retrieve regulations list', err);
    return NextResponse.json({ error: err.message || 'Failed to list regulations.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Auth Guard: Only BAKEUDA or SUPER_ADMIN can execute approvals
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { regulasi_id, action, notes } = body;

    if (!regulasi_id || !action) {
      return NextResponse.json({ error: 'regulasi_id dan action wajib dikirim.' }, { status: 400 });
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Action harus bernilai APPROVE atau REJECT.' }, { status: 400 });
    }

    // 1. Get target regulation draft
    const doc = await databases.getDocument(DB_ID, REGULASI_COL, regulasi_id);
    const targetTahun = doc.tahun_anggaran;

    const email = auth.context?.email || 'admin@sipdades.go.id';

    if (action === 'APPROVE') {
      // 2. Deactivate any other active regulations for the same tahun_anggaran
      const others = await databases.listDocuments(DB_ID, REGULASI_COL, [
        Query.equal('tahun_anggaran', targetTahun),
        Query.equal('is_active', true),
        Query.limit(50)
      ]);

      for (const otherDoc of others.documents) {
        if (otherDoc.$id !== regulasi_id) {
          await databases.updateDocument(DB_ID, REGULASI_COL, otherDoc.$id, {
            is_active: false
          });
          logger.info('REGULASI_APPROVAL_POST', `Deactivated old regulation: ${otherDoc.$id} for year ${targetTahun}`);
        }
      }

      // 3. Activate and approve the target draft
      await databases.updateDocument(DB_ID, REGULASI_COL, regulasi_id, {
        is_active: true,
        status_persetujuan: 'APPROVED'
      });

      // 4. Write audit log
      await databases.createDocument(DB_ID, AUDIT_LOG_COL, ID.unique(), {
        regulasi_id,
        tahun_anggaran: targetTahun,
        approver_email: email,
        action: 'APPROVE',
        notes: notes || 'Disetujui untuk diaktifkan di production.',
        timestamp: new Date().toISOString()
      });

      logger.info('REGULASI_APPROVAL_POST', `Regulation ${regulasi_id} successfully approved by ${email}`);

      return NextResponse.json({
        status: 'success',
        message: `Regulasi ${doc.nama_peraturan || doc.$id} berhasil disetujui dan diaktifkan untuk TA ${targetTahun}.`
      });

    } else {
      // action === 'REJECT'
      await databases.updateDocument(DB_ID, REGULASI_COL, regulasi_id, {
        is_active: false,
        status_persetujuan: 'REJECTED'
      });

      // Write audit log
      await databases.createDocument(DB_ID, AUDIT_LOG_COL, ID.unique(), {
        regulasi_id,
        tahun_anggaran: targetTahun,
        approver_email: email,
        action: 'REJECT',
        notes: notes || 'Draf ditolak oleh verifikator.',
        timestamp: new Date().toISOString()
      });

      logger.info('REGULASI_APPROVAL_POST', `Regulation ${regulasi_id} successfully rejected by ${email}`);

      return NextResponse.json({
        status: 'success',
        message: `Regulasi draf ${doc.nama_peraturan || doc.$id} berhasil ditolak.`
      });
    }

  } catch (err: any) {
    logger.error('REGULASI_APPROVAL_POST', 'Approval process failed', err);
    return NextResponse.json({ error: err.message || 'Server Error' }, { status: 500 });
  }
}

import { Client, Databases, ID, Query } from 'node-appwrite';
import { logger } from '@/utils/logger';

/**
 * Persistent Kill-Switch — Fix #3 (Post-Audit 2026-08-05)
 *
 * State sebelumnya disimpan sebagai variabel in-memory `let state = {...}`.
 * Masalah: pada Next.js serverless, setiap cold-start akan me-reset state,
 * sehingga admin toggle yang dilakukan tidak persisten antar-restart.
 *
 * Solusi: state dibaca dari koleksi `admin_settings` di Appwrite DB,
 * dan ditulis ke sana setiap ada perubahan. In-memory state tetap dipakai
 * sebagai cache untuk performa (menghindari DB round-trip per request OCR).
 */

const COLLECTION_ID = 'admin_settings';
const DOCUMENT_ID  = 'kill_switch_state';
const DB_ID        = 'sipdades_db';

interface KillSwitchState {
  active: boolean;
  reason: string;
  updatedAt: string;
  monthlyUsageCostUsd: number;
  monthlyBudgetLimitUsd: number;
}

// In-memory cache — diisi saat pertama kali dibaca dari DB
let cachedState: KillSwitchState | null = null;

function buildClient(): Databases {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);
  return new Databases(client);
}

/**
 * Baca state dari Appwrite DB.
 * Jika koleksi/dokumen belum ada, inisialisasi dengan nilai default dan buat dokumennya.
 */
export async function getKillSwitchState(): Promise<KillSwitchState> {
  // Kembalikan cache jika sudah ada (fresh untuk siklus hidup instance ini)
  if (cachedState) return { ...cachedState };

  const databases = buildClient();
  try {
    const doc = await databases.getDocument(DB_ID, COLLECTION_ID, DOCUMENT_ID);
    cachedState = {
      active: Boolean(doc.active),
      reason: String(doc.reason),
      updatedAt: String(doc.updatedAt),
      monthlyUsageCostUsd: Number(doc.monthlyUsageCostUsd),
      monthlyBudgetLimitUsd: Number(doc.monthlyBudgetLimitUsd),
    };
    return { ...cachedState };
  } catch (e: any) {
    if (e.code === 404) {
      // Dokumen belum ada — buat dengan nilai default
      logger.info('AI_KILL_SWITCH', 'Dokumen kill-switch belum ada di DB, membuat baru dengan default.');
      const defaultState: KillSwitchState = {
        active: false,
        reason: 'Operational Normal',
        updatedAt: new Date().toISOString(),
        monthlyUsageCostUsd: 0,
        monthlyBudgetLimitUsd: 50.00,
      };
      try {
        await databases.createDocument(DB_ID, COLLECTION_ID, DOCUMENT_ID, defaultState);
      } catch (createErr: any) {
        // Koleksi mungkin belum ada — jalankan setup script terpisah
        logger.warn('AI_KILL_SWITCH', 'Gagal membuat dokumen kill-switch. Koleksi admin_settings mungkin belum ada.', createErr.message);
      }
      cachedState = defaultState;
      return { ...defaultState };
    }
    // Error lain — fallback ke default tanpa memperbarui cache agar retry terus terjadi
    logger.error('AI_KILL_SWITCH', 'Gagal membaca state kill-switch dari DB', e);
    return {
      active: false,
      reason: 'DB Read Error — Fallback to Operational Normal',
      updatedAt: new Date().toISOString(),
      monthlyUsageCostUsd: 0,
      monthlyBudgetLimitUsd: 50.00,
    };
  }
}

/**
 * Tulis state baru ke Appwrite DB dan perbarui cache in-memory.
 */
export async function setKillSwitchState(
  active: boolean,
  reason: string = 'Manual Admin Trigger'
): Promise<KillSwitchState> {
  const current = await getKillSwitchState();
  const newState: KillSwitchState = {
    ...current,
    active,
    reason,
    updatedAt: new Date().toISOString(),
  };

  cachedState = newState;

  const databases = buildClient();
  try {
    await databases.updateDocument(DB_ID, COLLECTION_ID, DOCUMENT_ID, {
      active: newState.active,
      reason: newState.reason,
      updatedAt: newState.updatedAt,
      monthlyUsageCostUsd: newState.monthlyUsageCostUsd,
      monthlyBudgetLimitUsd: newState.monthlyBudgetLimitUsd,
    });
    logger.warn(
      'AI_KILL_SWITCH',
      `Kill switch status changed to ${active ? 'ACTIVE (FALLBACK MODE)' : 'INACTIVE'} — persisted to DB`,
      { reason }
    );
  } catch (e: any) {
    logger.error('AI_KILL_SWITCH', 'Gagal menyimpan state kill-switch ke DB (cache tetap diperbarui)', e.message);
  }

  return { ...newState };
}

/**
 * Catat penggunaan AI & otomatis aktifkan kill-switch jika budget terlampaui.
 * Juga mempersistensikan counter biaya ke DB.
 */
export async function recordAiUsage(costUsd: number): Promise<KillSwitchState> {
  const current = await getKillSwitchState();
  const updatedCost = current.monthlyUsageCostUsd + costUsd;

  // Perbarui cache dulu supaya respons cepat
  cachedState = { ...current, monthlyUsageCostUsd: updatedCost };

  const databases = buildClient();
  try {
    await databases.updateDocument(DB_ID, COLLECTION_ID, DOCUMENT_ID, {
      monthlyUsageCostUsd: updatedCost,
    });
  } catch (e: any) {
    logger.warn('AI_KILL_SWITCH', 'Gagal persistensikan usage cost ke DB', e.message);
  }

  if (updatedCost >= current.monthlyBudgetLimitUsd && !current.active) {
    return await setKillSwitchState(true, `Budget Limit Reached ($${current.monthlyBudgetLimitUsd.toFixed(2)} USD)`);
  }

  return { ...cachedState };
}

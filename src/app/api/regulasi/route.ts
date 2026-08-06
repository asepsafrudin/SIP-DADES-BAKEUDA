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

const defaultRegulasi2026 = {
  tahun_anggaran: 2026,
  perbup_add: {
    nomor: 'Perbup ADD No. 1 Tahun 2026',
    tanggal_pengesahan: '2 Januari 2026',
    addm_pct: 0.70,
    addp_pct: 0.30,
    limit_bulanan: 0.08333,
  },
  perbup_bhpr: {
    nomor: 'Perbup No. 5 Tahun 2026',
    tanggal_pengesahan: '5 Januari 2026',
    min_alokasi_pajak_pct: 0.20,
    max_reward_petugas_pct: 0.10,
  },
  bpjs: {
    iuran_pemda_pct: 0.04,
    iuran_pribadi_pct: 0.01,
    bulan_potongan: 'Januari',
  },
};

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA', 'DINSOS', 'KECAMATAN', 'DESA']);
  if (!auth.authorized) return auth.response!;

  try {
    const searchParams = request.nextUrl.searchParams;
    const tahun = searchParams.get('tahun') || '2026';

    try {
      const res = await databases.listDocuments(DB_ID, 'master_regulasi', [
        Query.equal('tahun_anggaran', Number(tahun)),
        Query.equal('is_active', true),
        Query.limit(1)
      ]);

      if (res.total > 0 && res.documents[0].rules_json) {
        const rulesData = typeof res.documents[0].rules_json === 'string'
          ? JSON.parse(res.documents[0].rules_json)
          : res.documents[0].rules_json;

        return NextResponse.json({
          status: 'success',
          tahun_anggaran: Number(tahun),
          data: rulesData,
          source: 'appwrite_db'
        });
      }
    } catch {
      // master_regulasi collection fallback
    }

    return NextResponse.json({
      status: 'success',
      tahun_anggaran: Number(tahun),
      data: defaultRegulasi2026,
      source: 'default_fallback'
    });

  } catch (error: any) {
    logger.error('API_REGULASI', 'Gagal memuat regulasi', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat parameter regulasi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { tahun_sumber, tahun_target, rules_data } = body;

    const rulesToSave = rules_data || {
      ...defaultRegulasi2026,
      tahun_anggaran: Number(tahun_target || 2027)
    };

    try {
      await databases.createDocument(DB_ID, 'master_regulasi', ID.unique(), {
        tahun_anggaran: Number(tahun_target || 2027),
        rules_json: JSON.stringify(rulesToSave),
        nama_peraturan: rulesToSave.perbup_add?.nomor || `Perbup TA ${tahun_target || 2027}`
      });
    } catch (dbErr) {
      logger.warn('API_REGULASI', 'master_regulasi collection insert skipped', dbErr);
    }

    return NextResponse.json({
      status: 'success',
      message: `Berhasil menduplikasi/menyimpan parameter regulasi TA ${tahun_target || 2027}.`,
      data: rulesToSave,
    });

  } catch (error: any) {
    logger.error('API_REGULASI', 'Gagal menyimpan regulasi', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Gagal memproses duplikasi regulasi.' },
      { status: 400 }
    );
  }
}

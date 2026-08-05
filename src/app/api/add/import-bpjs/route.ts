import { NextRequest, NextResponse } from 'next/server';
import { Client, Databases, Query, ID } from 'node-appwrite';
import * as xlsx from 'xlsx';

import { verifyAuth } from '@/lib/authMiddleware';

export const maxDuration = 180;

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DB_ID = "sipdades_db";

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req, ['SUPER_ADMIN', 'BAKEUDA']);
  if (!auth.authorized) return auth.response!;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bulanTagihan = formData.get('bulan_tagihan') as string | null;

    if (!file || !bulanTagihan) {
      return NextResponse.json({ error: 'File Excel dan bulan tagihan diperlukan' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    // Asumsikan data ada di sheet pertama yang berisi data individu (seperti '40143001')
    const targetSheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'transfer') || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];
    
    // Parse as array of arrays
    const rawData = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    const villageTotals = new Map<string, { iuran4: number, iuran1: number, total: number }>();

    for (const row of rawData) {
      if (!Array.isArray(row) || row.length < 7) continue;
      
      const namaDesaRaw = row[2]; // Column C: Nama Desa
      const potonganRaw = row[5]; // Column F: Potongan (BPJS)

      if (typeof namaDesaRaw !== 'string' || !namaDesaRaw) continue;
      if (namaDesaRaw.trim().toLowerCase() === 'nama desa') continue; // Header row

      const desaClean = namaDesaRaw.trim().toUpperCase();
      const total = parseFloat(String(potonganRaw).replace(/,/g, '')) || 0;

      if (!villageTotals.has(desaClean)) {
        villageTotals.set(desaClean, { iuran4: 0, iuran1: 0, total: 0 });
      }

      const current = villageTotals.get(desaClean)!;
      current.total += total;
    }

    // Cari database ID yang benar (karena fallback ke DB lama jika gagal buat)
    let activeDbId = DB_ID;
    try {
      await databases.get(DB_ID);
    } catch(e) {
      const dbs = await databases.list();
      if(dbs.total > 0) activeDbId = dbs.databases[0].$id;
    }

    // Fetch all master_desa to map names to IDs
    const masterDesaResponse = await databases.listDocuments(activeDbId, 'master_desa', [
      Query.limit(500)
    ]);
    const masterDesaMap = new Map(
      masterDesaResponse.documents.map(doc => [doc.nama_desa.toUpperCase(), doc.$id])
    );

    let successCount = 0;
    let failedCount = 0;
    const failedDesa = [];

function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  return track[str2.length][str1.length];
}

    // Save to Appwrite
    for (const [desaName, totals] of Array.from(villageTotals.entries())) {
      let desaId = masterDesaMap.get(desaName);
      
      // Fuzzy Levenshtein match fallback if exact match not found
      if (!desaId) {
        let bestMatchId: string | null = null;
        let minDistance = 999;
        for (const [masterName, id] of Array.from(masterDesaMap.entries())) {
          const dist = levenshteinDistance(desaName, masterName);
          if (dist < minDistance && dist <= 3) {
            minDistance = dist;
            bestMatchId = id;
          }
        }
        if (bestMatchId) desaId = bestMatchId;
      }

      if (!desaId) {
        failedCount++;
        failedDesa.push(desaName);
        continue;
      }

      try {
        await databases.createDocument(activeDbId, 'potongan_bpjs_bulanan', ID.unique(), {
          desa_id: desaId,
          bulan_tagihan: bulanTagihan,
          total_iuran_4_persen: totals.iuran4,
          total_iuran_1_persen: totals.iuran1,
          total_potongan: totals.total
        });
        successCount++;
      } catch (err) {
        console.error(`Gagal menyimpan potongan untuk ${desaName}:`, err);
        failedCount++;
        failedDesa.push(desaName);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil import ${successCount} desa. Gagal ${failedCount} desa.`,
      failed_desa: failedDesa
    });

  } catch (error: any) {
    console.error('Import BPJS Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}

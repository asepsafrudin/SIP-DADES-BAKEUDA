import { Client, Databases, Query, ID } from "node-appwrite";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !endpoint || !apiKey) {
  console.error("❌ Missing Appwrite configuration in .env");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

const STAGING_DB_ID = "sipdades_db_staging";
const STAGING_DB_NAME = "SIP DADES Database (Staging)";
const DB_ID = "sipdades_db";

async function setupStaging() {
  console.log("=========================================");
  console.log("🛠️ SETUP STAGING ENVIRONMENT & RESTORE");
  console.log("=========================================\n");

  try {
    const backupDir = path.resolve(process.cwd(), "storage", "backups");
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith("sipdades_db_snapshot_") && f.endsWith(".json"));
    files.sort().reverse();
    const snapshotPath = path.join(backupDir, files[0]);
    console.log(`📖 Loading snapshot: ${files[0]}`);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

    let activeSourceDbId = DB_ID;
    try {
      await databases.get(DB_ID);
    } catch {
      const dbs = await databases.list();
      if (dbs.total > 0) activeSourceDbId = dbs.databases[0].$id;
    }

    let targetDbId = STAGING_DB_ID;
    try {
      await databases.get(STAGING_DB_ID);
      console.log(`✅ Staging database ${STAGING_DB_ID} exists.`);
    } catch (e: any) {
      if (e.code === 404) {
        try {
          await databases.create(STAGING_DB_ID, STAGING_DB_NAME);
          console.log(`✅ Staging database ${STAGING_DB_ID} created.`);
        } catch {
          console.log("ℹ️ Re-using active database with '_staging' prefix fallback.");
          targetDbId = activeSourceDbId;
        }
      }
    }

    const collectionsToRestore = Object.keys(snapshot.collections || {});
    const restoreSummary: Record<string, number> = {};

    for (const sourceColId of collectionsToRestore) {
      const targetColId = targetDbId === STAGING_DB_ID ? sourceColId : `staging_${sourceColId}`;
      const colDocs: any[] = snapshot.collections[sourceColId];

      console.log(`\n⏳ Processing staging collection: "${targetColId}"...`);

      // Delete & Recreate staging_pagu_alokasi if docs = 0 to fix attribute type mismatch
      let existingDocs = { total: 0, documents: [] as any[] };
      try {
        existingDocs = await databases.listDocuments(targetDbId, targetColId, [Query.limit(1)]);
      } catch {
        // Collection doesn't exist
      }

      if (targetColId === "staging_pagu_alokasi" && existingDocs.total === 0) {
        try {
          await databases.deleteCollection(targetDbId, targetColId);
          console.log(`   -> Re-creating clean collection ${targetColId}...`);
        } catch {}
      }

      try {
        await databases.getCollection(targetDbId, targetColId);
      } catch {
        await databases.createCollection(targetDbId, targetColId, `Staging ${sourceColId}`);
        console.log(`   -> Created collection ${targetColId}`);
      }

      // Ensure explicit Float attributes for pagu numeric fields
      if (targetColId.includes("pagu_alokasi")) {
        const floatAttrs = ["pagu_total", "total_pagu_bruto", "pagu_dasar_addm", "pagu_proporsional_addp", "pagu_siltap_jaminan", "min_alokasi_pajak", "max_reward_petugas", "realisasi_kumulatif", "sisa_pagu"];
        const stringAttrs = ["desa", "desa_id", "jenis_dana", "nama_kegiatan", "sumber_dana"];
        const intAttrs = ["tahun_anggaran"];

        for (const f of floatAttrs) {
          try { await databases.createFloatAttribute(targetDbId, targetColId, f, false); } catch {}
        }
        for (const s of stringAttrs) {
          try { await databases.createStringAttribute(targetDbId, targetColId, s, 500, false); } catch {}
        }
        for (const i of intAttrs) {
          try { await databases.createIntegerAttribute(targetDbId, targetColId, i, false); } catch {}
        }

        // Wait 2s for Appwrite schema compilation
        await new Promise(r => setTimeout(r, 2000));
      }

      // Re-check existing documents count
      const checkDocs = await databases.listDocuments(targetDbId, targetColId, [Query.limit(1)]);

      if (checkDocs.total < colDocs.length && colDocs.length > 0) {
        console.log(`   -> Restoring ${colDocs.length} documents into ${targetColId}...`);
        let restoredCount = 0;
        for (const doc of colDocs) {
          try {
            const cleanData = { ...doc };
            delete cleanData.$id;
            delete cleanData.$createdAt;
            delete cleanData.$updatedAt;
            delete cleanData.$permissions;
            delete cleanData.$databaseId;
            delete cleanData.$collectionId;

            // Type casts for pagu_alokasi
            if (targetColId.includes("pagu_alokasi")) {
              if (cleanData.pagu_total !== null && cleanData.pagu_total !== undefined) {
                cleanData.pagu_total = parseFloat(String(cleanData.pagu_total)) || 0;
              }
              if (cleanData.total_pagu_bruto !== null && cleanData.total_pagu_bruto !== undefined) {
                cleanData.total_pagu_bruto = parseFloat(String(cleanData.total_pagu_bruto)) || 0;
              }
              if (cleanData.tahun_anggaran !== null && cleanData.tahun_anggaran !== undefined) {
                cleanData.tahun_anggaran = parseInt(String(cleanData.tahun_anggaran), 10) || 2026;
              }
            }

            await databases.createDocument(targetDbId, targetColId, doc.$id || ID.unique(), cleanData);
            restoredCount++;
          } catch (err: any) {
            if (err.code !== 409 && restoredCount < 3) {
              console.warn(`      ⚠️ Warning in ${targetColId}: ${err.message}`);
            }
          }
        }
        restoreSummary[targetColId] = restoredCount;
      } else {
        restoreSummary[targetColId] = checkDocs.total;
        console.log(`   -> Collection ${targetColId} active with ${checkDocs.total} docs.`);
      }
    }

    console.log("\n=========================================");
    console.log("🎉 STAGING ENVIRONMENT & RESTORE SUCCESSFUL!");
    console.log("Target Database:", targetDbId);
    console.log("Summary:", JSON.stringify(restoreSummary, null, 2));
    console.log("=========================================\n");

  } catch (error: any) {
    console.error("\n❌ Staging setup failed:", error);
    process.exit(1);
  }
}

setupStaging();

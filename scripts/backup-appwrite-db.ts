import { Client, Databases, Query } from "node-appwrite";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !endpoint || !apiKey) {
  console.error("❌ Missing Appwrite configuration in .env (NEXT_PUBLIC_APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_ENDPOINT, APPWRITE_API_KEY)");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

const DB_ID = "sipdades_db";

async function backupDatabase() {
  console.log("=========================================");
  console.log("📦 STARTING APPWRITE DATABASE BACKUP");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Project:  ${projectId}`);
  console.log(`Target DB: ${DB_ID}`);
  console.log("=========================================\n");

  try {
    // 1. Check & Resolve active DB ID
    let activeDbId = DB_ID;
    try {
      await databases.get(DB_ID);
      console.log(`✅ Connected to database: ${DB_ID}`);
    } catch (e: any) {
      console.log(`⚠️ Database ${DB_ID} not found directly, checking existing databases...`);
      const dbs = await databases.list();
      if (dbs.total > 0) {
        activeDbId = dbs.databases[0].$id;
        console.log(`ℹ️ Using active database: ${activeDbId} (${dbs.databases[0].name})`);
      } else {
        throw new Error("No database found in Appwrite instance.");
      }
    }

    // 2. Fetch all collections
    const collectionsRes = await databases.listCollections(activeDbId);
    console.log(`\nFound ${collectionsRes.total} collection(s) to backup.`);

    const snapshotData: Record<string, any[]> = {};
    const collectionSummary: Record<string, number> = {};

    for (const col of collectionsRes.collections) {
      console.log(`\n⏳ Backing up collection: "${col.name}" (${col.$id})...`);
      
      let allDocs: any[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const queries = [Query.limit(100)];
        if (cursor) {
          queries.push(Query.cursorAfter(cursor));
        }

        const docRes = await databases.listDocuments(activeDbId, col.$id, queries);
        allDocs.push(...docRes.documents);

        if (docRes.documents.length < 100) {
          hasMore = false;
        } else {
          cursor = docRes.documents[docRes.documents.length - 1].$id;
        }
      }

      snapshotData[col.$id] = allDocs;
      collectionSummary[col.$id] = allDocs.length;
      console.log(`   -> Total documents exported: ${allDocs.length}`);
    }

    // 3. Save snapshot file into storage/backups/
    const backupDir = path.resolve(process.cwd(), "storage", "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const snapshotFileName = `sipdades_db_snapshot_${timestamp}.json`;
    const snapshotFilePath = path.join(backupDir, snapshotFileName);

    const fullSnapshot = {
      metadata: {
        timestamp: new Date().toISOString(),
        database_id: activeDbId,
        total_collections: collectionsRes.collections.length,
        summary: collectionSummary,
      },
      collections: snapshotData,
    };

    fs.writeFileSync(snapshotFilePath, JSON.stringify(fullSnapshot, null, 2), "utf-8");

    console.log("\n=========================================");
    console.log("🎉 BACKUP COMPLETED SUCCESSFULLY!");
    console.log(`Snapshot saved to: ${snapshotFilePath}`);
    console.log("Summary:", JSON.stringify(collectionSummary, null, 2));
    console.log("=========================================\n");

  } catch (error: any) {
    console.error("\n❌ Backup failed with error:", error);
    process.exit(1);
  }
}

backupDatabase();

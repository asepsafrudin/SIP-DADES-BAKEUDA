/**
 * setup-db-sprint1.ts
 * 
 * 1. Membuat atribut `status_pbb_lunas` di master_desa & staging_master_desa.
 * 2. Mengisi nilai default (PANICAN = false, lainnya = true).
 * 3. Membuat koleksi `rate_limit` untuk distributed rate limiting.
 * 
 * Cara pakai:
 *   npx ts-node -r tsconfig-paths/register scripts/setup-db-sprint1.ts
 */

import { Client, Databases, Query, ID } from "node-appwrite";
import dotenv from "dotenv";
import path from "path";

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
const DB_ID = "sipdades_db";

async function runMigration() {
  console.log("🔧 Starting Sprint 1 Database Schema Migration...\n");

  // Determine actual DB ID
  let actualDbId = DB_ID;
  try {
    await databases.get(DB_ID);
    console.log(`✅ Database '${DB_ID}' found.`);
  } catch (e: any) {
    if (e.code === 404) {
      console.log(`⚠️ Database '${DB_ID}' not found. Querying database list...`);
      const dbs = await databases.list();
      if (dbs.total > 0) {
        actualDbId = dbs.databases[0].$id;
        console.log(`ℹ️ Using database: ${actualDbId} (${dbs.databases[0].name})`);
      } else {
        console.error("❌ No databases available.");
        process.exit(1);
      }
    } else {
      throw e;
    }
  }

  // 1. Add status_pbb_lunas attribute to master_desa and staging_master_desa
  const villageCollections = ["master_desa", "staging_master_desa"];
  for (const col of villageCollections) {
    try {
      console.log(`📦 Creating 'status_pbb_lunas' boolean attribute in collection: ${col}...`);
      await databases.createBooleanAttribute(actualDbId, col, "status_pbb_lunas", false, true);
      console.log(`  ✅ Attribute status_pbb_lunas created in ${col}.`);
    } catch (e: any) {
      if (e.code === 409) {
        console.log(`  ℹ️ Attribute status_pbb_lunas already exists in ${col}, skipping.`);
      } else {
        console.warn(`  ⚠️ Failed to create attribute in ${col}:`, e.message);
      }
    }
  }

  // 2. Create rate_limit collection
  const RATE_LIMIT_COL = "rate_limit";
  try {
    await databases.getCollection(actualDbId, RATE_LIMIT_COL);
    console.log(`✅ Collection '${RATE_LIMIT_COL}' already exists.`);
  } catch (e: any) {
    if (e.code === 404) {
      console.log(`📦 Creating collection '${RATE_LIMIT_COL}'...`);
      await databases.createCollection(actualDbId, RATE_LIMIT_COL, "Rate Limit", [
        "read(\"users\")",
        "create(\"users\")",
        "update(\"users\")",
        "delete(\"users\")"
      ]);
      console.log(`  ✅ Collection '${RATE_LIMIT_COL}' created.`);
    } else {
      throw e;
    }
  }

  // Add attributes to rate_limit collection
  console.log(`📋 Creating attributes for '${RATE_LIMIT_COL}' collection...`);
  const rateLimitAttrs = [
    { type: "string", key: "identifier", size: 100, required: true },
    { type: "integer", key: "timestamp", required: true },
    { type: "string", key: "ip", size: 100, required: false }
  ];

  for (const attr of rateLimitAttrs) {
    try {
      if (attr.type === "string") {
        await databases.createStringAttribute(actualDbId, RATE_LIMIT_COL, attr.key, attr.size!, attr.required);
      } else if (attr.type === "integer") {
        await databases.createIntegerAttribute(actualDbId, RATE_LIMIT_COL, attr.key, attr.required);
      }
      console.log(`  ✅ Attribute '${attr.key}' created in ${RATE_LIMIT_COL}.`);
    } catch (e: any) {
      if (e.code === 409) {
        console.log(`  ℹ️ Attribute '${attr.key}' already exists in ${RATE_LIMIT_COL}, skipping.`);
      } else {
        console.warn(`  ⚠️ Failed to create attribute '${attr.key}' in ${RATE_LIMIT_COL}:`, e.message);
      }
    }
  }

  console.log("\n⏳ Waiting 5 seconds for Appwrite schema compilation...");
  await new Promise(r => setTimeout(r, 5000));

  // 3. Populate PBB Status (PANICAN = false, others = true)
  for (const col of villageCollections) {
    try {
      console.log(`\n⚙️ Populating document values in: ${col}...`);
      const docs = await databases.listDocuments(actualDbId, col, [Query.limit(300)]);
      console.log(`   Found ${docs.total} documents in ${col}. Updating PBB status...`);
      let updateCount = 0;

      for (const doc of docs.documents) {
        const isPanican = doc.nama_desa.toUpperCase().includes("PANICAN");
        try {
          await databases.updateDocument(actualDbId, col, doc.$id, {
            status_pbb_lunas: !isPanican
          });
          updateCount++;
        } catch (updateErr: any) {
          console.error(`   ❌ Failed to update document ${doc.$id} (${doc.nama_desa}):`, updateErr.message);
        }
      }
      console.log(`   ✅ Successfully updated ${updateCount}/${docs.total} documents in ${col}.`);
    } catch (e: any) {
      console.error(`   ❌ Failed to populate data for ${col}:`, e.message);
    }
  }

  console.log("\n🎉 Database migration and population finished successfully!");
}

runMigration().catch((e) => {
  console.error("❌ Migration failed:", e.message);
  process.exit(1);
});

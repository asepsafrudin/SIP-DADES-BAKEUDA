/**
 * setup-admin-settings.ts
 * 
 * Membuat koleksi `admin_settings` di Appwrite DB untuk menyimpan state
 * kill-switch secara persisten. Jalankan sekali sebelum deploy.
 * 
 * Cara pakai:
 *   npx ts-node -r tsconfig-paths/register scripts/setup-admin-settings.ts
 */

import { Client, Databases } from "node-appwrite";
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
const COLLECTION_ID = "admin_settings";
const DOCUMENT_ID = "kill_switch_state";

async function setup() {
  console.log("🔧 Setting up admin_settings collection...\n");

  // 1. Cek apakah database ada
  let actualDbId = DB_ID;
  try {
    await databases.get(DB_ID);
    console.log(`✅ Database '${DB_ID}' ditemukan.`);
  } catch (e: any) {
    if (e.code === 404) {
      console.log(`⚠️  Database '${DB_ID}' tidak ada. Mencari database yang tersedia...`);
      const dbs = await databases.list();
      if (dbs.total > 0) {
        actualDbId = dbs.databases[0].$id;
        console.log(`ℹ️  Menggunakan database: ${actualDbId} (${dbs.databases[0].name})`);
      } else {
        console.error("❌ Tidak ada database yang tersedia.");
        process.exit(1);
      }
    } else {
      throw e;
    }
  }

  // 2. Cek/buat koleksi admin_settings
  try {
    await databases.getCollection(actualDbId, COLLECTION_ID);
    console.log(`✅ Koleksi '${COLLECTION_ID}' sudah ada.`);
  } catch (e: any) {
    if (e.code === 404) {
      console.log(`📦 Membuat koleksi '${COLLECTION_ID}'...`);
      await databases.createCollection(actualDbId, COLLECTION_ID, "Admin Settings", [
        "read(\"users\")",
        "create(\"users\")",
        "update(\"users\")",
        "delete(\"users\")"
      ]);
      console.log(`✅ Koleksi '${COLLECTION_ID}' berhasil dibuat.`);
    } else {
      throw e;
    }
  }

  // 3. Buat atribut-atribut yang diperlukan
  console.log("\n📋 Membuat atribut koleksi...");
  const attributes = [
    { type: "boolean", key: "active", required: true, default: false },
    { type: "string",  key: "reason", required: true, size: 500, default: "Operational Normal" },
    { type: "string",  key: "updatedAt", required: true, size: 30, default: new Date().toISOString() },
    { type: "double",  key: "monthlyUsageCostUsd", required: true, min: 0, max: 99999, default: 0 },
    { type: "double",  key: "monthlyBudgetLimitUsd", required: true, min: 0, max: 99999, default: 50 },
  ];

  for (const attr of attributes) {
    try {
      if (attr.type === "boolean") {
        await databases.createBooleanAttribute(actualDbId, COLLECTION_ID, attr.key, attr.required, attr.default as boolean);
      } else if (attr.type === "string") {
        await databases.createStringAttribute(actualDbId, COLLECTION_ID, attr.key, attr.size!, attr.required, attr.default as string);
      } else if (attr.type === "double") {
        await databases.createFloatAttribute(actualDbId, COLLECTION_ID, attr.key, attr.required, attr.min, attr.max, attr.default as number);
      }
      console.log(`  ✅ Atribut '${attr.key}' dibuat.`);
    } catch (e: any) {
      if (e.code === 409) {
        console.log(`  ℹ️  Atribut '${attr.key}' sudah ada, skip.`);
      } else {
        console.error(`  ❌ Gagal membuat atribut '${attr.key}':`, e.message);
      }
    }
  }

  // 4. Tunggu sebentar agar atribut diproses Appwrite
  console.log("\n⏳ Menunggu 2 detik agar atribut selesai dibuat di Appwrite...");
  await new Promise(r => setTimeout(r, 2000));

  // 5. Buat dokumen awal kill_switch_state (jika belum ada)
  try {
    await databases.getDocument(actualDbId, COLLECTION_ID, DOCUMENT_ID);
    console.log(`✅ Dokumen '${DOCUMENT_ID}' sudah ada.`);
  } catch (e: any) {
    if (e.code === 404) {
      console.log(`📄 Membuat dokumen awal '${DOCUMENT_ID}'...`);
      await databases.createDocument(actualDbId, COLLECTION_ID, DOCUMENT_ID, {
        active: false,
        reason: "Operational Normal",
        updatedAt: new Date().toISOString(),
        monthlyUsageCostUsd: 0,
        monthlyBudgetLimitUsd: 50.00,
      });
      console.log(`✅ Dokumen '${DOCUMENT_ID}' berhasil dibuat.`);
    } else {
      throw e;
    }
  }

  console.log("\n🎉 Setup admin_settings selesai!");
  console.log("   Kill-switch state sekarang tersimpan persisten di Appwrite DB.");
  console.log(`   DB: ${actualDbId} | Collection: ${COLLECTION_ID} | Document: ${DOCUMENT_ID}\n`);
}

setup().catch((e) => {
  console.error("❌ Setup gagal:", e.message);
  process.exit(1);
});

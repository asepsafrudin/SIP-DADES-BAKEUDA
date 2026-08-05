/**
 * setup-admin-settings.js
 * 
 * Membuat koleksi `admin_settings` di Appwrite DB untuk menyimpan state
 * kill-switch secara persisten. Jalankan sekali sebelum deploy.
 * 
 * Cara pakai:
 *   node scripts/setup-admin-settings.js
 */

const { Client, Databases } = require("node-appwrite");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const endpoint  = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const apiKey    = process.env.APPWRITE_API_KEY;

if (!projectId || !endpoint || !apiKey) {
  console.error("❌ Missing Appwrite configuration in .env");
  console.error("   Pastikan NEXT_PUBLIC_APPWRITE_PROJECT_ID, NEXT_PUBLIC_APPWRITE_ENDPOINT, dan APPWRITE_API_KEY sudah ada.");
  process.exit(1);
}

const client    = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

const DB_ID         = "sipdades_db";
const COLLECTION_ID = "admin_settings";
const DOCUMENT_ID   = "kill_switch_state";

async function setup() {
  console.log("🔧 Setting up admin_settings collection...\n");

  // 1. Cek database — fallback ke database pertama jika sipdades_db tidak ada
  let actualDbId = DB_ID;
  try {
    await databases.get(DB_ID);
    console.log(`✅ Database '${DB_ID}' ditemukan.`);
  } catch (e) {
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
  } catch (e) {
    if (e.code === 404) {
      console.log(`📦 Membuat koleksi '${COLLECTION_ID}'...`);
      await databases.createCollection(actualDbId, COLLECTION_ID, "Admin Settings");
      console.log(`✅ Koleksi '${COLLECTION_ID}' berhasil dibuat.`);
    } else {
      throw e;
    }
  }

  // 3. Buat atribut (idempotent — skip jika sudah ada)
  console.log("\n📋 Membuat atribut koleksi...");

  async function safeCreateAttr(fn, key) {
    try {
      await fn();
      console.log(`  ✅ Atribut '${key}' dibuat.`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  ℹ️  Atribut '${key}' sudah ada, skip.`);
      } else {
        console.error(`  ❌ Gagal membuat atribut '${key}':`, e.message);
      }
    }
  }

  await safeCreateAttr(
    () => databases.createBooleanAttribute(actualDbId, COLLECTION_ID, "active", false, false),
    "active"
  );
  await safeCreateAttr(
    () => databases.createStringAttribute(actualDbId, COLLECTION_ID, "reason", 500, false, "Operational Normal"),
    "reason"
  );
  await safeCreateAttr(
    () => databases.createStringAttribute(actualDbId, COLLECTION_ID, "updatedAt", 30, false, new Date().toISOString()),
    "updatedAt"
  );
  await safeCreateAttr(
    () => databases.createFloatAttribute(actualDbId, COLLECTION_ID, "monthlyUsageCostUsd", false, 0, 99999, 0),
    "monthlyUsageCostUsd"
  );
  await safeCreateAttr(
    () => databases.createFloatAttribute(actualDbId, COLLECTION_ID, "monthlyBudgetLimitUsd", false, 0, 99999, 50),
    "monthlyBudgetLimitUsd"
  );

  // 4. Tunggu agar Appwrite selesai memproses atribut
  console.log("\n⏳ Menunggu 3 detik agar atribut selesai diproses Appwrite...");
  await new Promise(r => setTimeout(r, 3000));

  // 5. Buat dokumen awal jika belum ada
  try {
    await databases.getDocument(actualDbId, COLLECTION_ID, DOCUMENT_ID);
    console.log(`✅ Dokumen '${DOCUMENT_ID}' sudah ada.`);
  } catch (e) {
    if (e.code === 404) {
      console.log(`📄 Membuat dokumen awal '${DOCUMENT_ID}'...`);
      await databases.createDocument(actualDbId, COLLECTION_ID, DOCUMENT_ID, {
        active:                false,
        reason:                "Operational Normal",
        updatedAt:             new Date().toISOString(),
        monthlyUsageCostUsd:   0,
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

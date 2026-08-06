/**
 * setup-db-sprint2.js
 * 
 * 1. Membuat koleksi `master_regulasi` & `staging_master_regulasi` jika belum ada.
 * 2. Membuat atribut untuk regulasi: tahun_anggaran, rules_json, nama_peraturan, is_active, status_persetujuan.
 * 3. Mengisi data default regulasi 2026 (aktif & disetujui).
 * 4. Membuat koleksi `audit_log_regulasi` untuk log persetujuan.
 * 
 * Cara pakai:
 *   node scripts/setup-db-sprint2.js
 */

const { Client, Databases, ID } = require("node-appwrite");
const dotenv = require("dotenv");
const path = require("path");

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

const defaultRegulasi2026 = {
  tahun_anggaran: 2026,
  perbup_add: {
    nomor: 'Perbup No. 3 Tahun 2026',
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

async function runMigration() {
  console.log("🔧 Starting Sprint 2 Database Schema Migration...\n");

  let actualDbId = DB_ID;
  try {
    await databases.get(DB_ID);
    console.log(`✅ Database '${DB_ID}' found.`);
  } catch (e) {
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

  // 1. Create regulasi collections
  const regulasiCollections = ["master_regulasi", "staging_master_regulasi"];
  for (const col of regulasiCollections) {
    try {
      await databases.getCollection(actualDbId, col);
      console.log(`✅ Collection '${col}' already exists.`);
    } catch (e) {
      if (e.code === 404) {
        console.log(`📦 Creating collection '${col}'...`);
        await databases.createCollection(actualDbId, col, col === "master_regulasi" ? "Master Regulasi" : "Staging Master Regulasi", [
          "read(\"users\")",
          "create(\"users\")",
          "update(\"users\")",
          "delete(\"users\")"
        ]);
        console.log(`  ✅ Collection '${col}' created.`);
      } else {
        throw e;
      }
    }

    // Create attributes for regulasi
    console.log(`📋 Creating attributes for '${col}' collection...`);
    const regulasiAttrs = [
      { type: "integer", key: "tahun_anggaran", required: true },
      { type: "string", key: "rules_json", size: 5000, required: true },
      { type: "string", key: "nama_peraturan", size: 255, required: true },
      { type: "boolean", key: "is_active", required: false, default: false },
      { type: "string", key: "status_persetujuan", size: 50, required: false, default: "PENDING" }
    ];

    for (const attr of regulasiAttrs) {
      try {
        if (attr.type === "integer") {
          await databases.createIntegerAttribute(actualDbId, col, attr.key, attr.required);
        } else if (attr.type === "string") {
          await databases.createStringAttribute(actualDbId, col, attr.key, attr.size, attr.required, attr.default);
        } else if (attr.type === "boolean") {
          await databases.createBooleanAttribute(actualDbId, col, attr.key, attr.required, attr.default);
        }
        console.log(`  ✅ Attribute '${attr.key}' created in ${col}.`);
      } catch (err) {
        if (err.code === 409) {
          console.log(`  ℹ️ Attribute '${attr.key}' already exists in ${col}, skipping.`);
        } else {
          console.warn(`  ⚠️ Failed to create attribute '${attr.key}' in ${col}:`, err.message);
        }
      }
    }
  }

  // 2. Create audit_log_regulasi collection
  const AUDIT_LOG_COL = "audit_log_regulasi";
  try {
    await databases.getCollection(actualDbId, AUDIT_LOG_COL);
    console.log(`✅ Collection '${AUDIT_LOG_COL}' already exists.`);
  } catch (e) {
    if (e.code === 404) {
      console.log(`📦 Creating collection '${AUDIT_LOG_COL}'...`);
      await databases.createCollection(actualDbId, AUDIT_LOG_COL, "Audit Log Regulasi", [
        "read(\"users\")",
        "create(\"users\")",
        "update(\"users\")",
        "delete(\"users\")"
      ]);
      console.log(`  ✅ Collection '${AUDIT_LOG_COL}' created.`);
    } else {
      throw e;
    }
  }

  // Add attributes to audit_log_regulasi
  console.log(`📋 Creating attributes for '${AUDIT_LOG_COL}' collection...`);
  const auditAttrs = [
    { type: "string", key: "regulasi_id", size: 50, required: true },
    { type: "integer", key: "tahun_anggaran", required: true },
    { type: "string", key: "approver_email", size: 100, required: true },
    { type: "string", key: "action", size: 20, required: true },
    { type: "string", key: "notes", size: 500, required: false },
    { type: "string", key: "timestamp", size: 30, required: true }
  ];

  for (const attr of auditAttrs) {
    try {
      if (attr.type === "string") {
        await databases.createStringAttribute(actualDbId, AUDIT_LOG_COL, attr.key, attr.size, attr.required);
      } else if (attr.type === "integer") {
        await databases.createIntegerAttribute(actualDbId, AUDIT_LOG_COL, attr.key, attr.required);
      }
      console.log(`  ✅ Attribute '${attr.key}' created in ${AUDIT_LOG_COL}.`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  ℹ️ Attribute '${attr.key}' already exists in ${AUDIT_LOG_COL}, skipping.`);
      } else {
        console.warn(`  ⚠️ Failed to create attribute '${attr.key}' in ${AUDIT_LOG_COL}:`, e.message);
      }
    }
  }

  console.log("\n⏳ Waiting 6 seconds for Appwrite schema compilation...");
  await new Promise(r => setTimeout(r, 6000));

  // 3. Populate default 2026 regulation
  for (const col of regulasiCollections) {
    try {
      console.log(`\n⚙️ Populating default 2026 regulation in: ${col}...`);
      const existing = await databases.listDocuments(actualDbId, col, []);
      if (existing.total === 0) {
        await databases.createDocument(actualDbId, col, ID.unique(), {
          tahun_anggaran: 2026,
          rules_json: JSON.stringify(defaultRegulasi2026),
          nama_peraturan: "Perbup No. 3 Tahun 2026 (ADD) & No. 5 Tahun 2026 (BHPR)",
          is_active: true,
          status_persetujuan: "APPROVED"
        });
        console.log(`   ✅ Default regulation document created successfully in ${col}.`);
      } else {
        console.log(`   ℹ️ Regulations already exist in ${col}, skipping populate.`);
      }
    } catch (e) {
      console.error(`   ❌ Failed to populate data for ${col}:`, e.message);
    }
  }

  console.log("\n🎉 Database migration finished successfully!");
}

runMigration().catch((e) => {
  console.error("❌ Migration failed:", e.message);
  process.exit(1);
});

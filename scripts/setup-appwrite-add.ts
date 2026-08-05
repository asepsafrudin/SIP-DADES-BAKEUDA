import { Client, Databases } from "node-appwrite";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !endpoint || !apiKey) {
  console.error("Missing Appwrite configuration in .env");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

const DB_ID = "sip_dades_db";
const DB_NAME = "SIP DADES Database";
let actualDbId = DB_ID;

async function setup() {
  try {
    // 1. Create or get Database
    try {
      await databases.get(DB_ID);
      console.log(`Database ${DB_ID} already exists.`);
    } catch (e: any) {
      if (e.code === 404) {
        try {
          await databases.create(DB_ID, DB_NAME);
          console.log(`Database ${DB_ID} created successfully.`);
        } catch (createErr: any) {
          if (createErr.code === 403 && createErr.type === 'additional_resource_not_allowed') {
            console.log("Plan limit reached for creating new databases. Using the first existing database.");
            const dbs = await databases.list();
            if (dbs.total > 0) {
              actualDbId = dbs.databases[0].$id;
              console.log(`Using existing database: ${actualDbId} (${dbs.databases[0].name})`);
            } else {
              throw new Error("No existing database found and cannot create a new one.");
            }
          } else {
            throw createErr;
          }
        }
      } else {
        throw e;
      }
    }

    // Function to ensure collection exists
    const ensureCollection = async (collectionId: string, name: string) => {
      try {
        await databases.getCollection(actualDbId, collectionId);
        console.log(`Collection ${collectionId} already exists.`);
      } catch (e: any) {
        if (e.code === 404) {
          await databases.createCollection(actualDbId, collectionId, name);
          console.log(`Collection ${collectionId} created.`);
        } else {
          throw e;
        }
      }
    };

    // 2. Ensure Collections
    await ensureCollection("master_desa", "Master Desa");
    await ensureCollection("pagu_alokasi", "Pagu Alokasi");
    await ensureCollection("transaksi_pencairan", "Transaksi Pencairan");
    await ensureCollection("potongan_bpjs_bulanan", "Potongan BPJS Bulanan");

    // 3. Define Attributes for master_desa
    console.log("Setting up attributes for master_desa...");
    const createStringAttr = async (collectionId: string, key: string, size: number, required: boolean) => {
      try {
        await databases.createStringAttribute(actualDbId, collectionId, key, size, required);
        console.log(`- String Attribute ${key} created for ${collectionId}`);
      } catch (e: any) {
        if (e.code !== 409) console.error(e.message);
      }
    };
    
    const createFloatAttr = async (collectionId: string, key: string, required: boolean) => {
      try {
        await databases.createFloatAttribute(actualDbId, collectionId, key, required);
        console.log(`- Float Attribute ${key} created for ${collectionId}`);
      } catch (e: any) {
        if (e.code !== 409) console.error(e.message);
      }
    };

    const createIntegerAttr = async (collectionId: string, key: string, required: boolean) => {
      try {
        await databases.createIntegerAttribute(actualDbId, collectionId, key, required);
        console.log(`- Integer Attribute ${key} created for ${collectionId}`);
      } catch (e: any) {
        if (e.code !== 409) console.error(e.message);
      }
    };

    await createStringAttr("master_desa", "nama_desa", 100, true);
    await createStringAttr("master_desa", "kecamatan", 100, true);
    await createStringAttr("master_desa", "no_rekening", 50, false);
    await createStringAttr("master_desa", "nama_kepala_desa", 100, false);

    // Attributes for pagu_alokasi
    console.log("Setting up attributes for pagu_alokasi...");
    await createStringAttr("pagu_alokasi", "desa_id", 50, false);
    await createStringAttr("pagu_alokasi", "desa", 50, false);
    await createIntegerAttr("pagu_alokasi", "tahun_anggaran", false);
    await createStringAttr("pagu_alokasi", "jenis_dana", 50, false);
    await createFloatAttr("pagu_alokasi", "pagu_total", false);
    await createFloatAttr("pagu_alokasi", "total_pagu_bruto", false);

    // Attributes for transaksi_pencairan
    console.log("Setting up attributes for transaksi_pencairan...");
    await createStringAttr("transaksi_pencairan", "desa_id", 50, false);
    await createStringAttr("transaksi_pencairan", "pagu", 50, false);
    await createStringAttr("transaksi_pencairan", "pagu_id", 50, false);
    await createStringAttr("transaksi_pencairan", "jenis_dana", 50, false);
    await createStringAttr("transaksi_pencairan", "bulan_penyaluran", 20, false);
    await createStringAttr("transaksi_pencairan", "tahap_ke", 50, false);
    await createStringAttr("transaksi_pencairan", "keterangan", 255, false);
    await createFloatAttr("transaksi_pencairan", "nominal_pengajuan", false);
    await createFloatAttr("transaksi_pencairan", "potongan_bpjs", false);
    await createFloatAttr("transaksi_pencairan", "nominal_net", false);
    await createFloatAttr("transaksi_pencairan", "nominal_pencairan_net", false);
    await createStringAttr("transaksi_pencairan", "no_rekomendasi", 100, false);
    await createStringAttr("transaksi_pencairan", "status", 50, false);
    await createStringAttr("transaksi_pencairan", "status_verifikasi", 50, false);
    await createStringAttr("transaksi_pencairan", "file_kuitansi_id", 50, false);
    await createStringAttr("transaksi_pencairan", "hasil_ocr", 5000, false);

    // Attributes for potongan_bpjs_bulanan
    console.log("Setting up attributes for potongan_bpjs_bulanan...");
    await createStringAttr("potongan_bpjs_bulanan", "desa_id", 50, true);
    await createStringAttr("potongan_bpjs_bulanan", "bulan_tagihan", 50, true); // e.g., 'Agustus 2026'
    await createFloatAttr("potongan_bpjs_bulanan", "total_iuran_4_persen", true);
    await createFloatAttr("potongan_bpjs_bulanan", "total_iuran_1_persen", true);
    await createFloatAttr("potongan_bpjs_bulanan", "total_potongan", true);

    console.log("\nAppwrite initialization complete! Note: Attribute creation is asynchronous in Appwrite and might take a few moments to be fully active.");

  } catch (error) {
    console.error("Setup failed:", error);
  }
}

setup();

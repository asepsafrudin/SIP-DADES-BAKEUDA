import './dotenv-pre';
import { Client, Databases, Query } from 'node-appwrite';

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const apiKey = process.env.APPWRITE_API_KEY;

const client = new Client()
  .setEndpoint(endpoint!)
  .setProject(projectId!)
  .setKey(apiKey!);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';
const TRANSAKSI_COL = 'transaksi_pencairan';

async function seed() {
  const action = process.argv[2]; // 'seed' or 'clean'
  const targetId = process.argv[3]; // transaction doc ID to clean

  if (action === 'seed') {
    const villageList = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(1)]);
    if (villageList.total === 0) {
      console.error('No villages found.');
      process.exit(1);
    }
    const testDesa = villageList.documents[0];

    const testDoc = await databases.createDocument(DB_ID, TRANSAKSI_COL, 'unique()', {
      desa_id: testDesa.$id,
      jenis_dana: 'ADD',
      bulan_penyaluran: 'Agustus 2026',
      tahap_ke: 'Tahap I',
      nominal_pengajuan: 250000000,
      potongan_bpjs: 10000000,
      nominal_net: 240000000,
      nominal_pencairan_net: 240000000,
      status: 'DRAFT',
      status_verifikasi: 'DRAFT'
    });
    console.log(`SEED_SUCCESS:${testDoc.$id}`);
  } else if (action === 'clean' && targetId) {
    await databases.deleteDocument(DB_ID, TRANSAKSI_COL, targetId);
    console.log('CLEAN_SUCCESS');
  }
}

seed().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

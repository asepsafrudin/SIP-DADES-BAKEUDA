import './dotenv-pre';
import fs from 'fs';
import path from 'path';
import { Client, Databases, Query } from 'node-appwrite';

const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const apiKey = process.env.APPWRITE_API_KEY;

if (!projectId || !endpoint || !apiKey) {
  console.error('❌ Missing Appwrite configuration in .env');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);
const DB_ID = 'sipdades_db';
const TRANSAKSI_COL = 'transaksi_pencairan';

async function testUploadAPI() {
  console.log('====================================================');
  console.log('🧪 TESTING UPLOAD-SCAN API & STATUS TRANSITIONS');
  console.log('====================================================\n');

  try {
    // 1. Create a temporary test transaction to upload to
    console.log('📦 Creating temporary test transaction in Appwrite...');
    
    // Get a test village ID from master_desa first
    const villageList = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(1)]);
    if (villageList.total === 0) {
      console.error('❌ No villages found in master_desa. Run migration setup first.');
      process.exit(1);
    }
    const testDesa = villageList.documents[0];

    const testDoc = await databases.createDocument(DB_ID, TRANSAKSI_COL, 'unique()', {
      desa_id: testDesa.$id,
      jenis_dana: 'ADD',
      bulan_penyaluran: 'Agustus 2026',
      tahap_ke: 'Tahap I',
      nominal_pengajuan: 120000000,
      potongan_bpjs: 4800000,
      nominal_net: 115200000,
      nominal_pencairan_net: 115200000,
      status: 'DRAFT',
      status_verifikasi: 'DRAFT'
    });
    console.log(`   -> Created test transaction: ${testDoc.$id} (Desa: ${testDoc.desa_id})`);

    // 2. Prepare multipart form data payload
    console.log('📦 Preparing upload payload...');
    const filePath = path.resolve(process.cwd(), 'storage/Transfer_ADD_2026_8-1.pdf');
    if (!fs.existsSync(filePath)) {
      console.error('❌ Test file Transfer_ADD_2026_8-1.pdf not found in storage directory.');
      process.exit(1);
    }

    const fileStream = fs.createReadStream(filePath);
    const form = new FormData();
    form.append('transaction_id', testDoc.$id);
    
    // We fetch and convert file to Blob for standard fetch call
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    form.append('file', blob, 'Transfer_ADD_2026_8-1.pdf');

    // 3. Send request to localhost API (with fallback development headers)
    console.log('🚀 Sending POST request to /api/transactions/upload-scan...');
    const res = await fetch('http://localhost:3000/api/transactions/upload-scan', {
      method: 'POST',
      headers: {
        'x-user-role': 'BAKEUDA', // RBAC verification bypass in verifyAuth
      },
      body: form
    });

    const json = await res.json();
    console.log('📥 Response status:', res.status);
    console.log('📥 Response payload:', json);

    if (res.status === 200 && json.status === 'success') {
      console.log('\n✅ API call succeeded!');
      
      // 4. Verify status transition in DB
      console.log('🔎 Verifying status transition in Appwrite DB...');
      const updatedDoc = await databases.getDocument(DB_ID, TRANSAKSI_COL, testDoc.$id);
      console.log('   -> Updated Status:', updatedDoc.status_verifikasi);
      console.log('   -> file_kuitansi_id:', updatedDoc.file_kuitansi_id);
      
      if (updatedDoc.status_verifikasi === 'CAIR' && updatedDoc.file_kuitansi_id) {
        console.log('\n🎉 SUCCESS: Transaction successfully transition to CAIR, file_kuitansi_id populated!');
      } else {
        console.error('\n❌ FAILURE: Database status or file_kuitansi_id does not match expected values.');
      }
    } else {
      console.error('\n❌ FAILURE: API returned non-success response:', json);
    }

    // 5. Clean up temporary document
    console.log('\n🧹 Cleaning up temporary test document...');
    await databases.deleteDocument(DB_ID, TRANSAKSI_COL, testDoc.$id);
    console.log('   -> Cleaned up successfully.');

  } catch (err: any) {
    console.error('\n❌ Test execution failed with error:', err.message);
  }
}

testUploadAPI();

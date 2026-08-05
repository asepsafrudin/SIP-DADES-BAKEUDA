import { Client, Databases, Query, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

async function testTransactionValidation() {
  console.log('====================================================');
  console.log('🧪 TESTING TRANSACTION VALIDATION (RULES-AS-CODE)');
  console.log('====================================================\n');

  // Ambil salah satu desa (e.g. Kedungbenda)
  const desaRes = await databases.listDocuments(DB_ID, 'master_desa', [Query.limit(1)]);
  const testDesa = desaRes.documents[0];
  console.log(`Menggunakan desa uji: ${testDesa.nama_desa} ($id: ${testDesa.$id})`);

  // Cari pagu ADD desa
  const paguQuery = await databases.listDocuments(DB_ID, 'pagu_alokasi', [
    Query.equal('desa', testDesa.$id),
    Query.equal('tahun_anggaran', 2026)
  ]);
  const totalPagu = paguQuery.documents[0]?.total_pagu_bruto || paguQuery.documents[0]?.pagu_total || 600000000;
  console.log(`Pagu total desa: Rp ${totalPagu.toLocaleString('id-ID')}`);

  // Batas bulanan maksimal (1/12 pagu = ~8.33%)
  const limitBulanan = totalPagu * 0.08333;
  console.log(`Batas bulanan maksimal: Rp ${Math.round(limitBulanan).toLocaleString('id-ID')}`);

  // ------------------------------------------------------------------
  // SKENARIO A: MELEBIHI LIMIT BULANAN (ADD)
  // ------------------------------------------------------------------
  const nominalMelanggar = limitBulanan * 1.5; 
  console.log(`\n[A] Mencoba menyetujui pengajuan Rp ${nominalMelanggar.toLocaleString('id-ID')} (Batas: Rp ${Math.round(limitBulanan).toLocaleString('id-ID')})...`);

  const invalidDoc = await databases.createDocument(DB_ID, 'transaksi_pencairan', ID.unique(), {
    desa_id: testDesa.$id,
    jenis_dana: 'ADD',
    bulan_penyaluran: 'Agustus 2026',
    tahap_ke: 'Tahap I',
    nominal_pengajuan: nominalMelanggar,
    potongan_bpjs: 0,
    nominal_net: nominalMelanggar,
    nominal_pencairan_net: nominalMelanggar,
    status: 'DRAFT',
    status_verifikasi: 'DRAFT',
    keterangan: 'Simulasi Pengajuan Melanggar Limit Bulanan'
  });

  try {
    const response = await fetch('http://localhost:3000/api/transactions', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': 'BAKEUDA'
      },
      body: JSON.stringify({ id: invalidDoc.$id, status: 'DISETUJUI' })
    });
    
    const resData: any = await response.json();
    console.log(`   Status HTTP: ${response.status}`);
    console.log(`   Pesan Penolakan:`, resData.message);
    if (response.status === 400 && resData.pasal) {
      console.log(`   ✅ BERHASIL MEMBLOKIR (Rujukan: ${resData.pasal.join(', ')})`);
    } else {
      console.log(`   ❌ GAGAL MEMBLOKIR TRANSAKSI`);
    }
  } catch (err) {
    console.error('   Error saat memanggil API:', err);
  } finally {
    await databases.deleteDocument(DB_ID, 'transaksi_pencairan', invalidDoc.$id);
  }

  // ------------------------------------------------------------------
  // SKENARIO B: POTONGAN BPJS JANUARI MISMATCH (ADD)
  // ------------------------------------------------------------------
  const nominalJanuari = 30000000;
  const bpjsSalah = 500000; // Seharusnya 4% = 1.200.000
  console.log(`\n[B] Mencoba menyetujui pengajuan bulan Januari sebesar Rp ${nominalJanuari.toLocaleString('id-ID')} dengan BPJS salah Rp ${bpjsSalah.toLocaleString('id-ID')} (Seharusnya 4%)...`);

  const invalidBpjsDoc = await databases.createDocument(DB_ID, 'transaksi_pencairan', ID.unique(), {
    desa_id: testDesa.$id,
    jenis_dana: 'ADD',
    bulan_penyaluran: 'Januari 2026',
    tahap_ke: 'Tahap I',
    nominal_pengajuan: nominalJanuari,
    potongan_bpjs: bpjsSalah,
    nominal_net: nominalJanuari - bpjsSalah,
    nominal_pencairan_net: nominalJanuari - bpjsSalah,
    status: 'DRAFT',
    status_verifikasi: 'DRAFT',
    keterangan: 'Simulasi Potongan BPJS Salah'
  });

  try {
    const response = await fetch('http://localhost:3000/api/transactions', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': 'BAKEUDA'
      },
      body: JSON.stringify({ id: invalidBpjsDoc.$id, status: 'DISETUJUI' })
    });
    
    const resData: any = await response.json();
    console.log(`   Status HTTP: ${response.status}`);
    console.log(`   Pesan Penolakan:`, resData.message);
    if (response.status === 400 && resData.pasal) {
      console.log(`   ✅ BERHASIL MEMBLOKIR (Rujukan: ${resData.pasal.join(', ')})`);
    } else {
      console.log(`   ❌ GAGAL MEMBLOKIR TRANSAKSI`);
    }
  } catch (err) {
    console.error('   Error saat memanggil API:', err);
  } finally {
    await databases.deleteDocument(DB_ID, 'transaksi_pencairan', invalidBpjsDoc.$id);
  }

  // ------------------------------------------------------------------
  // SKENARIO C: BHPR TAHAP II DESA PANICAN (PBB BELUM LUNAS)
  // ------------------------------------------------------------------
  let panicanId = '';
  try {
    const panicanRes = await databases.listDocuments(DB_ID, 'master_desa', [Query.equal('nama_desa', 'PANICAN'), Query.limit(1)]);
    if (panicanRes.total > 0) {
      panicanId = panicanRes.documents[0].$id;
    }
  } catch {}

  if (panicanId) {
    console.log(`\n[C] Mencoba menyetujui BHPR Tahap II untuk Desa PANICAN (Simulasi PBB Belum Lunas 100%)...`);
    
    const bhprDoc = await databases.createDocument(DB_ID, 'transaksi_pencairan', ID.unique(), {
      desa_id: panicanId,
      jenis_dana: 'BHPR',
      bulan_penyaluran: 'Desember 2026',
      tahap_ke: 'Tahap II',
      nominal_pengajuan: 25000000,
      potongan_bpjs: 0,
      nominal_net: 25000000,
      nominal_pencairan_net: 25000000,
      status: 'DRAFT',
      status_verifikasi: 'DRAFT',
      keterangan: 'Simulasi BHPR Tahap II Panican'
    });

    try {
      const response = await fetch('http://localhost:3000/api/transactions', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': 'BAKEUDA'
        },
        body: JSON.stringify({ id: bhprDoc.$id, status: 'DISETUJUI' })
      });
      const resData: any = await response.json();
      console.log(`   Status HTTP: ${response.status}`);
      console.log(`   Pesan Penolakan:`, resData.message);
      if (response.status === 400 && resData.pasal) {
        console.log(`   ✅ BERHASIL MEMBLOKIR (Rujukan: ${resData.pasal.join(', ')})`);
      } else {
        console.log(`   ❌ GAGAL MEMBLOKIR TRANSAKSI`);
      }
    } catch (err) {
      console.error('   Error saat memanggil API:', err);
    } finally {
      await databases.deleteDocument(DB_ID, 'transaksi_pencairan', bhprDoc.$id);
    }
  } else {
    console.log('\n[C] Skip: Desa PANICAN tidak ditemukan.');
  }

  // ------------------------------------------------------------------
  // SKENARIO D: TRANSAKSI VALID (Lolos Validasi)
  // ------------------------------------------------------------------
  const nominalValid = Math.round(limitBulanan * 0.5);
  console.log(`\n[D] Mencoba mengajukan transaksi valid sebesar Rp ${nominalValid.toLocaleString('id-ID')}...`);

  const validDoc = await databases.createDocument(DB_ID, 'transaksi_pencairan', ID.unique(), {
    desa_id: testDesa.$id,
    jenis_dana: 'ADD',
    bulan_penyaluran: 'Agustus 2026',
    tahap_ke: 'Tahap I',
    nominal_pengajuan: nominalValid,
    potongan_bpjs: 0,
    nominal_net: nominalValid,
    nominal_pencairan_net: nominalValid,
    status: 'DRAFT',
    status_verifikasi: 'DRAFT',
    keterangan: 'Simulasi Transaksi Valid Lolos Guardrail'
  });

  try {
    const response = await fetch('http://localhost:3000/api/transactions', {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-role': 'BAKEUDA'
      },
      body: JSON.stringify({ id: validDoc.$id, status: 'DISETUJUI' })
    });
    
    const resData: any = await response.json();
    console.log(`   Status HTTP: ${response.status}`);
    if (response.status === 200 && resData.status === 'success') {
      console.log(`   ✅ BERHASIL DISETUJUI (Status DB: ${resData.data.status_verifikasi})`);
    } else {
      console.log(`   ❌ GAGAL MENYETUJUI TRANSAKSI VALID:`, resData.message);
    }
  } catch (err) {
    console.error('   Error saat memanggil API:', err);
  } finally {
    await databases.deleteDocument(DB_ID, 'transaksi_pencairan', validDoc.$id);
  }
  
  console.log('\n====================================================');
  console.log('🧪 TESTING COMPLETE');
  console.log('====================================================\n');
}

testTransactionValidation();

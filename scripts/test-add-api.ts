import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testBPJSImport() {
  console.log('--- MENGUJI API IMPORT BPJS ---');
  const filePath = '/mnt/c/Users/aseps/OneDrive/Teguh Gasda/Transfer ADD 2026 8-1.xls';
  
  if (!fs.existsSync(filePath)) {
    console.error(`File Excel tidak ditemukan di ${filePath}`);
    return;
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('bulan_tagihan', 'Agustus 2026');

  try {
    const response = await fetch('http://localhost:3005/api/add/import-bpjs', {
      method: 'POST',
      body: formData,
    });
    
    const text = await response.text();
    console.log(`Status HTTP: ${response.status}`);
    console.log(`Response:`, text);
  } catch (error) {
    console.error('Error saat menghubungi API Import BPJS:', error);
  }
}

async function testRekapSPM() {
  console.log('\n--- MENGUJI API CETAK SPM PDF ---');
  try {
    const response = await fetch('http://localhost:3005/api/add/rekap-spm?bulan=Agustus 2026');
    
    if (response.ok) {
      const buffer = await response.buffer();
      const outPath = 'scripts/SPM_ADD_Test.pdf';
      fs.writeFileSync(outPath, buffer);
      console.log(`Berhasil men-generate PDF! File disimpan di: ${outPath}`);
    } else {
      const text = await response.text();
      console.error(`Gagal generate PDF (Status ${response.status}):`, text);
    }
  } catch (error) {
    console.error('Error saat menghubungi API Rekap SPM:', error);
  }
}

async function runAllTests() {
  await testBPJSImport();
  // Kita tunggu sebentar agar data di Appwrite selesai terindeks
  await new Promise(r => setTimeout(r, 2000));
  await testRekapSPM();
}

runAllTests();

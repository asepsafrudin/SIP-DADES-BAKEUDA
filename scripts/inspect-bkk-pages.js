/**
 * scripts/inspect-bkk-pages.js
 * 
 * Mengambil halaman-halaman dari PDF BKK (biasanya halaman 4 ke atas berisi tabel),
 * mengonversinya ke image, dan mengirimkannya ke RunPod untuk di-OCR.
 * Ini membantu kita melihat format teks mentah (raw text) hasil OCR.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Ekstrak halaman 5 (indeks 4) dari PDF menggunakan python & fitz
console.log('⏳ Mengekstrak halaman 5 dari PDF...');
const pythonCmd = `python3 -c "
import fitz
doc = fitz.open('/home/aseps/MCP/workspace/SIP-DADES/storage/raw/regulasi/SK No 900_113 ttg Alokasi BKK 2026.pdf')
page = doc[4] # Halaman 5
pix = page.get_pixmap(dpi=150)
pix.save('/tmp/bkk_page_5.jpg')
print('Halaman 5 disimpan ke /tmp/bkk_page_5.jpg')
"`;
execSync(pythonCmd);

// 2. Baca file image yang diekstrak dan convert ke base64
const imgBytes = fs.readFileSync('/tmp/bkk_page_5.jpg');
const base64Data = imgBytes.toString('base64');
console.log('✅ File loaded, size:', imgBytes.length, 'bytes');

const payload = {
  input: {
    image: base64Data
  }
};

const apiKey = process.env.RUNPOD_API_KEY || 'PLACEHOLDER_KEY';
const endpointId = process.env.RUNPOD_ENDPOINT_ID || 'PLACEHOLDER_ID';


console.log('⏳ Mengirim halaman 5 ke RunPod Serverless...');
fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(job => {
  console.log('ℹ️ Job submitted, ID:', job.id);
  
  const checkStatus = () => {
    fetch(`https://api.runpod.ai/v2/${endpointId}/status/${job.id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    .then(res => res.json())
    .then(status => {
      console.log('  → Status:', status.status);
      if (status.status === 'COMPLETED') {
        console.log('\n🎉 Sukses! Raw Text hasil OCR Halaman 5:\n');
        console.log(status.output.raw_text);
        console.log('\n=== Parsed Data ===');
        console.log(JSON.stringify(status.output.data, null, 2));
      } else if (status.status === 'FAILED') {
        console.error('❌ Gagal:', status);
      } else {
        setTimeout(checkStatus, 2000);
      }
    });
  };
  
  setTimeout(checkStatus, 2000);
})
.catch(err => {
  console.error('❌ Error:', err);
});

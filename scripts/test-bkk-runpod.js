/**
 * scripts/test-bkk-runpod.js
 * 
 * Menguji parser OCR RunPod secara langsung menggunakan file real PDF BKK.
 */

const fs = require('fs');
const path = require('path');

const pdfPath = '/home/aseps/MCP/workspace/SIP-DADES/storage/raw/regulasi/SK No 900_113 ttg Alokasi BKK 2026.pdf';
if (!fs.existsSync(pdfPath)) {
  console.error('❌ File tidak ditemukan:', pdfPath);
  process.exit(1);
}

const fileBytes = fs.readFileSync(pdfPath);
const base64Data = fileBytes.toString('base64');
console.log('✅ File loaded, size:', fileBytes.length, 'bytes');

const payload = {
  input: {
    image: base64Data
  }
};

const apiKey = process.env.RUNPOD_API_KEY || 'PLACEHOLDER_KEY';
const endpointId = process.env.RUNPOD_ENDPOINT_ID || 'PLACEHOLDER_ID';


console.log('⏳ Mengirim job ke RunPod Serverless...');
fetch(`https://api.runpod.ai/v2/${endpointId}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  },
  body: JSON.stringify(payload)
})
.then(res => {
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
})
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
        console.log('🎉 Sukses! Output:');
        console.log(JSON.stringify(status.output, null, 2));
      } else if (status.status === 'FAILED') {
        console.error('❌ Gagal:', status);
      } else {
        setTimeout(checkStatus, 3000);
      }
    })
    .catch(err => {
      console.error('❌ Gagal check status:', err.message);
      setTimeout(checkStatus, 3000);
    });
  };
  
  setTimeout(checkStatus, 3000);
})
.catch(err => {
  console.error('❌ Error:', err);
});

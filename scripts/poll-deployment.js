/**
 * scripts/poll-deployment.js
 * 
 * Melakukan polling ke endpoint RunPod Serverless setiap 30 detik untuk mendeteksi
 * kapan kontainer baru selesai di-deploy. Indikator sukses adalah jika hasil parser
 * OCR mengembalikan metadata_sumber_dana = "BKK" untuk file BKK (sebelumnya TMMD).
 */

const fs = require('fs');

const pdfPath = '/home/aseps/MCP/workspace/SIP-DADES/storage/raw/regulasi/SK No 900_113 ttg Alokasi BKK 2026.pdf';
if (!fs.existsSync(pdfPath)) {
  console.error('❌ File tidak ditemukan:', pdfPath);
  process.exit(1);
}

// Gunakan halaman 5 yang ukurannya kecil
const { execSync } = require('child_process');
try {
  execSync('ls /tmp/bkk_page_5.jpg');
} catch (e) {
  console.log('⏳ Mengekstrak halaman 5...');
  execSync(`python3 -c "
import fitz
doc = fitz.open('${pdfPath}')
page = doc[4]
pix = page.get_pixmap(dpi=100)
pix.save('/tmp/bkk_page_5.jpg')
"`);
}

const imgBytes = fs.readFileSync('/tmp/bkk_page_5.jpg');
const base64Data = imgBytes.toString('base64');

const payload = {
  input: {
    image: base64Data
  }
};

const apiKey = process.env.RUNPOD_API_KEY || 'PLACEHOLDER_KEY';
const endpointId = process.env.RUNPOD_ENDPOINT_ID || 'PLACEHOLDER_ID';


let attempts = 0;
const maxAttempts = 15; // 7.5 menit

const poll = () => {
  attempts++;
  console.log(`\n[${new Date().toLocaleTimeString()}] Polling RunPod Serverless (Percobaan ${attempts}/${maxAttempts})...`);
  
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
    const checkStatus = () => {
      fetch(`https://api.runpod.ai/v2/${endpointId}/status/${job.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      .then(res => res.json())
      .then(status => {
        if (status.status === 'COMPLETED') {
          const resDana = status.output.data?.metadata_sumber_dana;
          console.log(`  → Pekerjaan selesai. metadata_sumber_dana = "${resDana}"`);
          if (resDana === 'BKK') {
            console.log('\n🎉 SUCCESS! Deploy RunPod selesai & aktif dengan kode terbaru (BKK Mode)!');
            console.log(`   Jumlah data desa terekstrak: ${status.output.data.data.length} desa.`);
            process.exit(0);
          } else {
            console.log('  → Worker masih menggunakan versi lama (TMMD Mode). Menunggu deployment...');
            scheduleNext();
          }
        } else if (status.status === 'FAILED') {
          console.error('  ❌ Pekerjaan gagal:', status.error);
          scheduleNext();
        } else {
          process.stdout.write('.');
          setTimeout(checkStatus, 3000);
        }
      })
      .catch(e => {
        console.error('  ❌ Gagal cek status:', e.message);
        scheduleNext();
      });
    };
    
    setTimeout(checkStatus, 3000);
  })
  .catch(err => {
    console.error('❌ Error submitting job:', err.message);
    scheduleNext();
  });
};

const scheduleNext = () => {
  if (attempts >= maxAttempts) {
    console.log('\n⚠️ Polling timeout. Pastikan untuk menekan "Rebuild" di dashboard RunPod jika deployment GitHub sudah selesai.');
    process.exit(1);
  }
  setTimeout(poll, 30000);
};

// Start
poll();

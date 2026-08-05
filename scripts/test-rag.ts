import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testRagExtraction() {
  console.log('====================================================');
  console.log('🧪 TESTING RAG-ENHANCED AI POLICY COMPILER');
  console.log('====================================================\n');

  const mockText = `
    Berdasarkan Peraturan Bupati No. 12 Tahun 2026 tentang Alokasi Dana Desa (ADD):
    1. Alokasi ADD dibagi menjadi ADD Minimum (ADD M) sebesar 75% dan ADD Proporsional (ADD P) sebesar 25%.
    2. Batas maksimum penyaluran bulanan ditetapkan sebesar 1/12 pagu desa (limit bulanan 0.08333).
    3. Potongan iuran BPJS Kesehatan sebesar 4% bagi pemda dan 1% mandiri, dipotong otomatis di bulan Januari.
  `;

  console.log('Mengirim teks regulasi simulasi ke /api/regulasi/extract-rules...');
  
  try {
    const response = await fetch('http://localhost:3000/api/regulasi/extract-rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'BAKEUDA'
      },
      body: JSON.stringify({
        extracted_text: mockText,
        tahun_anggaran: 2026
      })
    });

    console.log(`Status HTTP: ${response.status}`);
    const resData: any = await response.json();
    
    if (response.ok && resData.status === 'success') {
      console.log('✅ RAG & Gemini Extraction SUCCESSFUL!');
      console.log('Hasil Kompilasi Parameter:');
      console.log(JSON.stringify(resData.data, null, 2));
    } else {
      console.log('❌ Extraction Failed:', resData.message || resData.error);
    }
  } catch (err) {
    console.error('Error connecting to Next.js API:', err);
  }
}

testRagExtraction();

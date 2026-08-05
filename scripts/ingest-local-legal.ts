import fs from 'fs';
import path from 'path';
import { callMcpTool } from '../src/lib/mcpClient';

const filesToIngest = [
  {
    filePath: 'docs/workflows/Perbup_ADD_No_1_Tahun_2026_Batang_Tubuh.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_perbup_add_2026_batang_tubuh'
  },
  {
    filePath: 'docs/workflows/Perbup_ADD_No_1_Tahun_2026_Lampiran.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_perbup_add_2026_lampiran'
  },
  {
    filePath: 'docs/workflows/SK_TMMD_2026_Batang_Tubuh.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sk_tmmd_2026_batang_tubuh'
  },
  {
    filePath: 'docs/workflows/SK_TMMD_2026_Lampiran.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sk_tmmd_2026_lampiran'
  },
  {
    filePath: 'docs/workflows/Surat_BPJS_0726.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_surat_bpjs_0726'
  },
  {
    filePath: 'docs/workflows/Perbup_No_5_Tahun_2026.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_perbup_no_5_2026'
  },
  {
    filePath: 'docs/workflows/Perbup_No_9_Tahun_2025.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_perbup_no_9_2025'
  },
  {
    filePath: 'docs/workflows/SK_Bupati_Alokasi_BHPR_2026.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sk_bupati_alokasi_bhpr_2026'
  },
  {
    filePath: 'docs/workflows/SK_Bupati_Alokasi_BKK_2026.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sk_bupati_alokasi_bkk_2026'
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function ingestAll() {
  console.log('====================================================');
  console.log('🚀 INGESTING PURBALINGGA LOCAL REGULATIONS INTO RAG');
  console.log('====================================================\n');

  for (const item of filesToIngest) {
    const fullPath = path.resolve(process.cwd(), item.filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${item.filePath}, skipping.`);
      continue;
    }

    console.log(`Ingesting [${item.filePath}] by chunking (100 lines per chunk)...`);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    const lines = rawContent.split('\n');
    const chunkSize = 100;
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      const chunkContent = chunkLines.join('\n');
      const chunkDocId = `${item.docId}_chunk_${i / chunkSize}`;
      
      console.log(`   -> Ingesting chunk ${i / chunkSize} (${chunkLines.length} lines)...`);
      try {
        const result = await callMcpTool('knowledge_ingest_text', {
          content: chunkContent,
          doc_id: chunkDocId,
          namespace: item.namespace,
          metadata: JSON.stringify({
            source_file: item.filePath,
            title: `${path.basename(item.filePath, '.md').replace(/_/g, ' ')} - Chunk ${i / chunkSize}`,
            ingested_at: new Date().toISOString()
          })
        });
        console.log(`      ✅ Chunk success! Ingest result:`, result);
      } catch (err: any) {
        console.error(`      ❌ Chunk failed:`, err.message);
      }
      await delay(1000); // Jeda agar tidak membebani server
    }
  }

  console.log('\n====================================================');
  console.log('🎉 PURBALINGGA LOCAL REGULATIONS INGESTION COMPLETE');
  console.log('====================================================');
}

ingestAll();

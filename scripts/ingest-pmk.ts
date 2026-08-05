import fs from 'fs';
import path from 'path';
import { callMcpTool } from '../src/lib/mcpClient';

const filesToIngest = [
  {
    filePath: 'docs/workflows/PMK_7_2026_Batang_Tubuh.md',
    namespace: 'purbalingga_legal',
    docId: 'pmk_7_2026_batang_tubuh'
  },
  {
    filePath: 'docs/workflows/PMK_7_2026_Lampiran_IRID_Purbalingga.md',
    namespace: 'purbalingga_legal',
    docId: 'pmk_7_2026_lampiran_irid_purbalingga'
  },
  {
    filePath: 'docs/workflows/PMK_7_2026_Lampiran_DD_Purbalingga.md',
    namespace: 'purbalingga_legal',
    docId: 'pmk_7_2026_lampiran_dd_purbalingga'
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function ingestAll() {
  console.log('====================================================');
  console.log('🚀 INGESTING PMK 7 TAHUN 2026 INTO PURBALINGGA RAG');
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
  console.log('🎉 PMK 7 INGESTION COMPLETE');
  console.log('====================================================');
}

ingestAll();

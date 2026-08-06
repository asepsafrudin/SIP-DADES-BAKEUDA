import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { callMcpTool } from '../src/lib/mcpClient';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const filesToIngest = [
  {
    filePath: 'docs/prosedur_summary.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_prosedur_summary'
  },
  {
    filePath: 'docs/workflows/SOP_ADD_Bulanan.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sop_add_bulanan'
  },
  {
    filePath: 'docs/workflows/SOP_BHPR_Tahunan.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sop_bhpr_tahunan'
  },
  {
    filePath: 'docs/workflows/SOP_BKK_Termin.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_sop_bkk_termin'
  },
  {
    filePath: 'docs/workflows/Perbup_9_2025_BHPR_Rules.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_perbup_bhpr_rules'
  },
  {
    filePath: 'docs/workflows/Data_DD_Purbalingga_2026.md',
    namespace: 'purbalingga_legal',
    docId: 'purbalingga_data_dd_2026'
  },
  {
    filePath: 'docs/workflows/Regulatory_Rule_Engine.md',
    namespace: 'bakeuda_internal',
    docId: 'bakeuda_regulatory_rule_engine'
  },
  {
    filePath: 'docs/workflows/SuperAdmin_Data_Ingestion.md',
    namespace: 'bakeuda_internal',
    docId: 'bakeuda_superadmin_data_ingestion'
  },
  {
    filePath: 'docs/workflows/UX_RBAC_Plan.md',
    namespace: 'bakeuda_internal',
    docId: 'bakeuda_ux_rbac_plan'
  },
  {
    filePath: 'docs/architecture/AI_Native_GovTech_Engine.md',
    namespace: 'bakeuda_internal',
    docId: 'bakeuda_ai_native_govtech_engine'
  },
  {
    filePath: 'docs/architecture/Tech_Stack_and_Billing.md',
    namespace: 'bakeuda_internal',
    docId: 'bakeuda_tech_stack_billing'
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function ingestAll() {
  console.log('====================================================');
  console.log('🚀 INGESTING DOCUMENTS INTO PURBALINGGA/BAKEUDA RAG');
  console.log('====================================================\n');

  for (const item of filesToIngest) {
    const fullPath = path.resolve(process.cwd(), item.filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${item.filePath}, skipping.`);
      continue;
    }

    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    
    // Chunk large datasets
    if (item.filePath.includes('Data_DD_Purbalingga_2026')) {
      console.log(`Ingesting [${item.filePath}] by chunking (100 lines per chunk)...`);
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
        await delay(1000);
      }
    } else {
      console.log(`Ingesting [${item.filePath}] to namespace [${item.namespace}]...`);
      try {
        const result = await callMcpTool('knowledge_ingest_text', {
          content: rawContent,
          doc_id: item.docId,
          namespace: item.namespace,
          metadata: JSON.stringify({
            source_file: item.filePath,
            title: path.basename(item.filePath, '.md').replace(/_/g, ' '),
            ingested_at: new Date().toISOString()
          })
        });
        console.log(`   ✅ Success! Ingest result:`, result);
      } catch (err: any) {
        console.error(`   ❌ Failed to ingest ${item.filePath}:`, err.message);
      }
      await delay(1000);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 INGESTION COMPLETE');
  console.log('====================================================');
}

ingestAll();

import { callMcpTool } from './mcpClient';
import { logger } from '@/utils/logger';

export interface RagResult {
  content: string;
  metadata?: any;
  score?: number;
}

export async function searchRag(
  query: string,
  namespace: string = 'purbalingga_legal',
  limit: number = 3
): Promise<string> {
  try {
    logger.info('RAG_CLIENT', `Searching RAG knowledge base for namespace: "${namespace}", query: "${query.slice(0, 50)}..."`);
    const result = await callMcpTool('knowledge_search', {
      query,
      namespace,
      limit
    });

    if (result && Array.isArray(result.results)) {
      logger.info('RAG_CLIENT', `RAG query success: found ${result.results.length} matched sections.`);
      return result.results.map((r: any) => r.content).join('\n\n');
    }
    
    // Fallback: Check backup namespace bakeuda_internal if empty
    if (namespace !== 'bakeuda_internal') {
      logger.info('RAG_CLIENT', `No results in "${namespace}", searching backup namespace "bakeuda_internal"...`);
      const backupResult = await callMcpTool('knowledge_search', {
        query,
        namespace: 'bakeuda_internal',
        limit
      });
      if (backupResult && Array.isArray(backupResult.results)) {
        return backupResult.results.map((r: any) => r.content).join('\n\n');
      }
    }

    return '';
  } catch (err: any) {
    logger.warn('RAG_CLIENT', `RAG query failed or timed out: ${err.message}. Failing open with empty context.`);
    return ''; // Fail open so the AI application continues operating without RAG context
  }
}

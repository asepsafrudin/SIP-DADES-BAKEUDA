import { logger } from '@/utils/logger';

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://127.0.0.1:8000';
const MCP_SSE_URL = `${MCP_SERVER_URL}/sse`;

/**
 * Panggil tool dari local persistent MCP server via SSE + POST JSON-RPC
 */
async function callMcpToolRaw(toolName: string, args: any = {}): Promise<any> {
  logger.info('MCP_CLIENT', `Mengirim request call_tool: ${toolName}...`);

  let response: Response;
  try {
    response = await fetch(MCP_SSE_URL);
  } catch (err: any) {
    logger.error('MCP_CLIENT', `Gagal terhubung ke MCP SSE server pada ${MCP_SSE_URL}`, err);
    throw new Error(`MCP Server unreachable: ${err.message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to connect to MCP SSE server: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('MCP SSE response has no body stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let endpointUrl = '';

  // 1. Dapatkan endpoint url dari stream
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataPath = line.substring(6).trim();
          endpointUrl = `${MCP_SERVER_URL}${dataPath}`;
          break;
        }
      }

      if (endpointUrl) break;
    }
  } catch (err) {
    reader.cancel();
    throw err;
  }

  if (!endpointUrl) {
    reader.cancel();
    throw new Error('Failed to get message endpoint from MCP SSE stream');
  }

  try {
    // 2. Lakukan Handshake: Kirim request 'initialize'
    const initRequestId = `init-${Math.random().toString(36).substring(2, 11)}`;
    const initRequest = {
      jsonrpc: '2.0',
      id: initRequestId,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'nextjs-client',
          version: '1.0.0'
        }
      }
    };

    let postResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initRequest)
    });

    if (!postResponse.ok) {
      throw new Error(`Initialize POST request failed with status: ${postResponse.status}`);
    }

    // Baca response initialize dari stream
    let initSuccess = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          try {
            const payload = JSON.parse(jsonStr);
            if (payload.id === initRequestId) {
              initSuccess = true;
              break;
            }
          } catch {}
        }
      }
      if (initSuccess) break;
    }

    // 3. Kirim notifications/initialized
    const initializedNotification = {
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    };

    postResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initializedNotification)
    });

    if (!postResponse.ok) {
      throw new Error(`Notification initialized POST failed with status: ${postResponse.status}`);
    }

    // 4. Kirim request tools/call
    const requestId = `call-${Math.random().toString(36).substring(2, 11)}`;
    const callRequest = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    postResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callRequest)
    });

    if (!postResponse.ok) {
      throw new Error(`POST request to MCP endpoint failed with status: ${postResponse.status}`);
    }

    // 5. Baca response dari stream SSE
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.substring(6).trim();
          try {
            const payload = JSON.parse(jsonStr);
            if (payload.id === requestId) {
              if (payload.error) {
                throw new Error(payload.error.message || `Error calling tool ${toolName}`);
              }
              const content = payload.result?.content;
              if (Array.isArray(content) && content[0]?.text) {
                const text = content[0].text;
                try {
                  return JSON.parse(text);
                } catch {
                  return text;
                }
              }
              return payload.result;
            }
          } catch (e: any) {
            if (e.message && e.message.includes('Error calling tool')) {
              throw e;
            }
          }
        }
      }
    }
  } finally {
    reader.cancel();
  }

  throw new Error(`No response received from MCP server for request to call tool ${toolName}`);
}

export async function callMcpTool(toolName: string, args: any = {}): Promise<any> {
  const maxRetries = Number(process.env.MCP_MAX_RETRIES) || 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callMcpToolRaw(toolName, args);
    } catch (err: any) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i) * 1000;
      logger.warn('MCP_CLIENT', `Retry ${i + 1}/${maxRetries} after ${delay}ms for tool ${toolName} due to error: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error(`Max retries exceeded for tool ${toolName}`);
}

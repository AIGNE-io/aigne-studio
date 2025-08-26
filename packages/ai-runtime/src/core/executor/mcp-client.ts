import { isChatCompletionChunk } from '@blocklet/aigne-hub/api/types/chat';
import { getComponentWebEndpoint } from '@blocklet/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
import { joinURL } from 'ufo';

import { MCPAssistant } from '../../types';
import { AgentExecutorBase } from './base';

export class McpAgentExecutor extends AgentExecutorBase<MCPAssistant> {
  override async process(options: { inputs: { [key: string]: any } }): Promise<any> {
    const { mcp } = this.agent;
    if (!mcp) throw new Error('MCP assistant is not configured');

    this.context.mcpInstances[this.agent.mcp!.blocklet.did] ??= (async () => {
      const url = new URL(joinURL(getComponentWebEndpoint(mcp.blocklet.did), '/sse'));
      if (process.env.FORCE_SSE_PORT) url.port = process.env.FORCE_SSE_PORT;
      const transport = new SSEClientTransport(url);
      const client = new Client({
        name: 'aigne-runtime',
        version: '0.0.1',
      });
      await client.connect(transport);
      return client;
    })();

    const client = await this.context.mcpInstances[this.agent.mcp!.blocklet.did]!;

    if (mcp.type === 'tool') {
      return await client.callTool({
        name: mcp.name,
        arguments: options.inputs,
      });
    }
    if (mcp.type === 'prompt') {
      const prompt = await client.getPrompt({
        name: mcp.name,
        arguments: options.inputs,
      });
      let text = '';
      const result = await this.context.callAI({
        input: {
          messages: prompt.messages as any,
        },
      });
      for await (const chunk of result) {
        if (isChatCompletionChunk(chunk)) {
          text += chunk.delta.content || '';
        }
      }
      return { content: { type: 'text', text } };
    }
    if (mcp.type === 'resource') {
      if (!mcp.uri) throw new Error('MCP resource uri is not configured');
      return await client.readResource({
        uri: mcp.uri,
      });
    }

    throw new Error(`Unknown MCP assistant type: ${mcp.type}`);
  }
}

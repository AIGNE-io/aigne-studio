import { config } from '@blocklet/sdk';
import { Events, MountPoint, components } from '@blocklet/sdk/lib/config';
import { Client } from '@modelcontextprotocol/sdk/client/index';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
import { joinURL } from 'ufo';

import logger from '../logger';
import { MCPAssistant, Parameter } from '../types';

const cache: { [blockletDid: string]: Promise<MCPAssistant[]> } = {};

config.events.on(Events.componentStarted, (components) => {
  for (const component of components) {
    cache[component.did] = getMCPAssistantsFromBlocklet(component);
  }
});
config.events.on(Events.componentStopped, (components) => {
  for (const component of components) {
    delete cache[component.did];
  }
});

export async function getMcpResources({ blockletDid }: { blockletDid?: string } = {}) {
  return (
    await Promise.all(
      components.map(async (blocklet) => {
        if (blockletDid && blocklet.did !== blockletDid) {
          return [];
        }

        cache[blocklet.did] ??= getMCPAssistantsFromBlocklet(blocklet);

        return cache[blocklet.did]!;
      })
    )
  ).flat();
}

async function getMCPAssistantsFromBlocklet(blocklet: MountPoint): Promise<MCPAssistant[]> {
  // ignore blocklets without web endpoint such as resource blocklets
  if (!blocklet.webEndpoint) {
    return [];
  }

  let client: Client | undefined;

  try {
    const url = new URL(joinURL(blocklet.webEndpoint, '/sse'));
    if (process.env.FORCE_SSE_PORT) url.port = process.env.FORCE_SSE_PORT;

    const check = await fetch(url, { method: 'HEAD' });
    if (check.status === 404 || !check.headers.get('content-type')?.includes('text/event-stream')) return [];
    if (!check.ok) throw new Error(`Failed to connect to ${url} ${check.status} ${check.statusText}`);

    const transport = new SSEClientTransport(url);
    client = new Client({
      name: 'aigne-runtime',
      version: '0.0.1',
    });
    await client.connect(transport);

    const capabilities = client.getServerCapabilities();

    const [prompts, resources, tools] = await Promise.all([
      capabilities?.prompts
        ? client.listPrompts().then(({ prompts }) =>
            prompts.map((prompt) => ({
              blocklet,
              type: 'prompt' as const,
              name: prompt.name,
              uri: undefined,
              description: prompt.description,
              inputSchema: undefined,
            }))
          )
        : [],
      capabilities?.resources
        ? client.listResources().then(({ resources }) =>
            resources.map((resource) => ({
              blocklet,
              type: 'resource' as const,
              name: resource.name,
              uri: resource.uri,
              description: resource.description,
              inputSchema: undefined,
            }))
          )
        : [],
      capabilities?.tools
        ? client.listTools().then(({ tools }) =>
            tools.map((tool) => ({
              blocklet,
              type: 'tool' as const,
              name: tool.name,
              uri: undefined,
              description: tool.description,
              inputSchema: tool.inputSchema,
            }))
          )
        : [],
    ]);

    return [...prompts, ...resources, ...tools].map((resource) => ({
      id: [resource.type, resource.name].join('_'),
      type: 'mcp' as const,
      name: resource.name,
      description: resource.description,
      mcp: {
        type: resource.type,
        name: resource.name,
        blocklet: {
          did: resource.blocklet.did,
          name: resource.blocklet.name,
          title: resource.blocklet.title,
        },
        uri: resource.uri,
      },
      parameters: Object.entries(resource.inputSchema?.properties ?? {}).map<Parameter>(([name, schema]: any) => ({
        id: name,
        key: name,
        type: schema.type,
        description: schema.description,
        required: schema.required,
      })),
      outputVariables: [
        {
          id: 'content',
          name: 'content',
          type: 'object',
          description: 'The output content',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: resource.blocklet.did,
      updatedBy: resource.blocklet.did,
    }));
  } catch (error) {
    logger.error('Failed to get component mcp resources', { error, blocklet });
  } finally {
    await client?.close();
  }

  return [];
}

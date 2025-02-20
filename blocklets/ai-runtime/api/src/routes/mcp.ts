import { getProject } from '@api/libs/agent';
import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { Parameter } from '@blocklet/ai-runtime/types';
import { getComponentMountPoint } from '@blocklet/sdk';
import { Server } from '@modelcontextprotocol/sdk/server/index';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types';
import { Router } from 'express';
import Joi from 'joi';
import { joinURL } from 'ufo';

const router = Router();

const CACHE = new Map<
  string,
  {
    transport: SSEServerTransport;
    server: Server;
  }
>();

const querySchema = Joi.object<{
  blockletDid?: string;
  projectId: string;
  projectRef?: string;
  working?: boolean;
}>({
  blockletDid: Joi.string().empty([null, '']).optional(),
  projectId: Joi.string().required(),
  projectRef: Joi.string().empty([null, '']).optional(),
  working: Joi.boolean().empty([null, '']).optional(),
});

router.get('/sse', async (req, res) => {
  const query = await querySchema.validateAsync(req.query, { stripUnknown: true });

  const project = await getProject({ ...query, agents: true });

  const server = new Server(
    {
      name: project?.name || 'Unknown AIGNE Project',
      version: '0.0.1',
    },
    {
      capabilities: { tools: {} },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const project = await getProject({ ...query, agents: true });

    const tools: Tool[] =
      project?.agents?.map((agent) => ({
        name: agent.name || agent.id,
        description: agent.description,
        inputSchema: {
          type: 'object',
          properties: Object.fromEntries(
            (agent.parameters ?? [])
              .filter((p) => isValidInput(p))
              .map((i) => [i.key, { type: (i.type || 'string') as any, description: i.placeholder }])
          ),
        },
      })) ?? [];

    return {
      tools,
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return {
      name,
      args,
    };
  });

  const transport = new SSEServerTransport(
    joinURL(getComponentMountPoint(AIGNE_RUNTIME_COMPONENT_DID), '/api/mcp/messages'),
    res
  );
  await server.connect(transport);

  CACHE.set(transport.sessionId, { server, transport });
});

router.post('/messages', async (req, res) => {
  const { sessionId } = req.query;
  const cache = CACHE.get(sessionId as string);
  if (!cache) throw new Error('No such session');

  await cache.transport.handlePostMessage(req, res, req.body);
});

export default router;

export const USER_INPUT_PARAMETER_TYPES = ['string', 'number', 'select', 'language', 'boolean', 'image', 'verify_vc'];

export function isValidInput(input: Parameter): input is Parameter & { key: string } {
  return !!input.key && USER_INPUT_PARAMETER_TYPES.includes(input.type || 'string');
}

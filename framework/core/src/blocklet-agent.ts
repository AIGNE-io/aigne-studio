import { DatasetObject } from '@blocklet/dataset-sdk/types';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';
import { joinURL, withQuery } from 'ufo';

import { Agent } from './agent';
import { TYPES } from './constants';
import type { Context, ContextState } from './context';
import { AuthConfig, FetchRequest, FormatMethod, InputDataTypeSchema } from './definitions/api-parameter';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import logger from './logger';
import { MemoryItemWithScore } from './memorable';
import { RunnableDefinition } from './runnable';
import { formatRequest } from './utils/format-parameter';

type GetAgentResult = {
  type: 'blocklet';
  id: string;
  name?: string;
  description?: string;
  openApi: DatasetObject;
};

@injectable()
export class BlockletAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Agent<I, O, Memories, State> {
  promise: Promise<{ agents: GetAgentResult[]; agentsMap: { [key: string]: GetAgentResult } }> | undefined;

  static create<I extends { [name: string]: InputDataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
    options: Parameters<typeof createBlockletAgentDefinition<I, O>>[0]
  ): BlockletAgent<SchemaMapType<I>, SchemaMapType<O>> {
    const definition = createBlockletAgentDefinition(options);
    return new BlockletAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: BlockletAgentDefinition,
    @inject(TYPES.context) context?: Context<State>
  ) {
    super(definition, context);
  }

  async process(input: I) {
    const {
      definition: { openapiId, auth, inputs },
      context,
    } = this;

    if (!openapiId) throw new Error('OpenAPI id is required');
    this.promise ??= this.getBlockletAgent();
    const { agentsMap } = await this.promise;
    const agent = agentsMap[openapiId];

    if (!agent) throw new Error('Blocklet agent not found');
    if (!agent.openApi) throw new Error('Blocklet agent api not found.');

    const link = new URL(config.env.appUrl);
    link.pathname = joinURL(getComponentMountPoint(agent.openApi.did || agent.openApi.name!), agent.openApi.path);

    const api = {
      url: link.toString(),
      method: agent.openApi.method as FormatMethod,
      auth,
    };

    const request = formatRequest(api, inputs, input);
    const contextState = pick(context?.state, ['userId', 'sessionId']);
    logger.debug('request', request);
    logger.debug('contextState', contextState);

    return await this.fetch(request);
  }

  async fetch(request: FetchRequest) {
    let cookieString = '';
    if (request.cookies) {
      cookieString = Object.entries(request.cookies)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('; ');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(withQuery(request.url, request.query || {}), {
      method: request.method,
      headers: {
        ...(request.method !== 'GET' && { 'Content-Type': 'application/json' }),
        ...(cookieString && { Cookie: cookieString.trim() }),
        ...(request.headers || {}),
      },
      body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
      credentials: request.cookies ? 'include' : 'same-origin',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      throw {
        status: response.status,
        statusText: response.statusText,
        data: await response.json().catch(() => null),
      };
    }

    const result = await response.json();
    return result;
  }

  async getBlockletAgent() {
    const response = await fetch(joinURL(config.env.appUrl, '/.well-known/service/openapi.json'));
    const list = await response.json();
    const openApis = [...flattenApiStructure(list as any)];

    const agents: GetAgentResult[] = openApis.map((i) => {
      return { type: 'blocklet', id: i.id, name: i?.summary, description: i?.description, openApi: i };
    });

    const agentsMap = agents.reduce(
      (acc, cur) => {
        acc[cur.id] = cur;
        return acc;
      },
      {} as Record<string, GetAgentResult>
    );

    return { agents, agentsMap, openApis };
  }
}

export function createBlockletAgentDefinition<
  I extends { [name: string]: InputDataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
>(options: {
  id?: string;
  name?: string;
  inputs: I;
  outputs: O;
  openapiId: string;
  auth?: AuthConfig;
}): BlockletAgentDefinition {
  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'blocklet_agent',
    inputs: schemaToDataType(options.inputs),
    outputs: schemaToDataType(options.outputs),
    openapiId: options.openapiId,
    auth: options.auth,
  };
}

export interface BlockletAgentDefinition extends RunnableDefinition {
  type: 'blocklet_agent';
  openapiId: string;
  auth?: AuthConfig;
}

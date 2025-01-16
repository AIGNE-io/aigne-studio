import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';
import { joinURL } from 'ufo';

import { Agent } from './agent';
import { TYPES } from './constants';
import type { Context, ContextState } from './context';
import { AuthConfig, FetchRequest, FormatMethod, InputDataTypeSchema } from './definitions/api-parameter';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import { CreateRunnableMemory } from './definitions/memory';
import { MemorableSearchOutput, MemoryItemWithScore } from './memorable';
import { RunnableDefinition } from './runnable';
import fetchApi from './utils/fetch-api';
import flattenApiStructure from './utils/flatten-openapi';
import { formatRequest } from './utils/format-parameter';

type GetAgentResult = {
  type: 'blocklet';
  id: string;
  name?: string;
  description?: string;
  openApi: {
    id: string;
    type: string;
    url?: string;
    name?: string;
    did?: string;
    path: string;
    method: string;
    [key: `x-summary-${string}`]: string | undefined;
    [key: `x-description-${string}`]: string | undefined;
  };
};

@injectable()
export class BlockletAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Agent<I, O, Memories, State> {
  promise: Promise<{ agents: GetAgentResult[]; agentsMap: { [key: string]: GetAgentResult } }> | undefined;

  static create = create;

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
    request.query = { ...contextState, ...(request.query || {}) };

    return this.fetch(request);
  }

  fetch(request: FetchRequest) {
    return fetchApi(request);
  }

  async getBlockletAgent() {
    const response = await fetch(joinURL(config.env.appUrl, '/.well-known/service/openapi.json'));
    const list = await response.json();
    const openApis = [...flattenApiStructure(list)];

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

export interface BlockletAgentDefinition extends RunnableDefinition {
  type: 'blocklet_agent';
  openapiId: string;
  auth?: AuthConfig;
}

export interface CreateBlockletAgentOptions<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
  State extends ContextState,
> {
  context?: Context<State>;

  id?: string;

  name?: string;

  inputs: I;

  outputs: O;

  memories?: Memories;

  openapiId: string;

  auth?: AuthConfig;
}

function create<
  I extends { [name: string]: InputDataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
  State extends ContextState,
>({
  context,
  ...options
}: CreateBlockletAgentOptions<I, O, Memories, State>): BlockletAgent<
  SchemaMapType<I>,
  SchemaMapType<O>,
  { [name in keyof Memories]: MemorableSearchOutput<Memories[name]['memory']> },
  State
> {
  const agentId = options.id || options.name || nanoid();

  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);

  return new BlockletAgent(
    {
      id: agentId,
      name: options.name,
      type: 'blocklet_agent',
      inputs,
      outputs,

      openapiId: options.openapiId,
      auth: options.auth,
    },
    context
  );
}

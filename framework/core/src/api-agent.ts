import { pick } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { Agent } from './agent';
import { TYPES } from './constants';
import type { Context, ContextState } from './context';
import { AuthConfig, FetchRequest, FormatMethod } from './definitions/api-parameter';
import { DataTypeSchema, InputDataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import { CreateRunnableMemory } from './definitions/memory';
import { MemorableSearchOutput, MemoryItemWithScore } from './memorable';
import { RunnableDefinition } from './runnable';
import { fetchApi } from './utils/fetch-api';
import { formatRequest } from './utils/format-parameter';

@injectable()
export class OpenAPIAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Agent<I, O, Memories, State> {
  static create = create;

  constructor(
    @inject(TYPES.definition) public override definition: OpenAPIAgentDefinition,
    @inject(TYPES.context) context?: Context<State>
  ) {
    super(definition, context);
  }

  async process(input: I) {
    const {
      definition: { url, method, auth, inputs },
      context,
    } = this;

    if (!url) throw new Error('API url is required');

    const api = {
      url,
      method,
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
}

export interface OpenAPIAgentDefinition extends RunnableDefinition {
  type: 'api_agent';
  url: string;
  method?: FormatMethod;
  auth?: AuthConfig;
}

export interface CreateOpenAPIAgentOptions<
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

  url: string;
  method?: FormatMethod;
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
}: CreateOpenAPIAgentOptions<I, O, Memories, State>): OpenAPIAgent<
  SchemaMapType<I>,
  SchemaMapType<O>,
  { [name in keyof Memories]: MemorableSearchOutput<Memories[name]['memory']> },
  State
> {
  const agentId = options.id || options.name || nanoid();

  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);

  return new OpenAPIAgent(
    {
      id: agentId,
      name: options.name,
      type: 'api_agent',
      inputs,
      outputs,

      url: options.url,
      method: options.method,
      auth: options.auth,
    },
    context
  );
}

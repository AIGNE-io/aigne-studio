import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';
import { withQuery } from 'ufo';

import { Agent } from './agent';
import { TYPES } from './constants';
import type { Context, ContextState } from './context';
import { API, FetchRequest, InputDataTypeSchema } from './definitions/api-parameter';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import { MemoryItemWithScore } from './memorable';
import { RunnableDefinition } from './runnable';
import { formatRequest } from './utils/format-parameter';

@injectable()
export class APIAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Agent<I, O, Memories, State> {
  static create<I extends { [name: string]: InputDataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
    options: Parameters<typeof createAPIAgentDefinition<I, O>>[0]
  ): APIAgent<SchemaMapType<I>, SchemaMapType<O>> {
    const definition = createAPIAgentDefinition(options);

    return new APIAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: APIAgentDefinition,
    @inject(TYPES.context) context?: Context<State>
  ) {
    super(definition, context);
  }

  async process(input: I) {
    const {
      definition: { api, inputs },
    } = this;

    if (!api.url) throw new Error('API url is required');

    const request = formatRequest(api, inputs, input);

    return await this.fetch(request);
  }

  async fetch(request: FetchRequest) {
    let cookieString = '';
    if (request.cookies) {
      cookieString = Object.entries(request.cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join(';');
    }

    const response = await fetch(withQuery(request.url, request.query || {}), {
      headers: {
        'Content-Type': 'application/json',
        ...(cookieString && { Cookie: cookieString }),
        ...(request.headers || {}),
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
      credentials: request.cookies ? 'include' : 'same-origin',
    });

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
}

export function createAPIAgentDefinition<
  I extends { [name: string]: InputDataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
>(options: { id?: string; name?: string; inputs: I; outputs: O; api: API }): APIAgentDefinition {
  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'api_agent',
    inputs: schemaToDataType(options.inputs),
    outputs: schemaToDataType(options.outputs),
    api: options.api,
  };
}

export interface APIAgentDefinition extends RunnableDefinition {
  type: 'api_agent';
  api: API;
}

import { callBlockletApi } from '@blocklet/dataset-sdk/request';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import config from '@blocklet/sdk/lib/config';
import axios from 'axios';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';
import { joinURL } from 'ufo';

import { TYPES } from './constants';
import type { Context } from './context';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './data-type-schema';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { objectToRunnableResponseStream } from './utils';

type User = {
  did: string;
  fullName?: string;
  avatar?: string;
};

@injectable()
export class BlockletAgent<I extends {} = {}, O extends {} = {}, State extends { user?: User } = {}> extends Runnable<
  I,
  O
> {
  promise: Promise<{ agents: GetAgentResult[]; agentsMap: { [key: string]: GetAgentResult } }> | undefined;

  static create<I extends { [name: string]: DataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
    options: Parameters<typeof createBlockletAgentDefinition<I, O>>[0]
  ): BlockletAgent<SchemaMapType<I>, SchemaMapType<O>> {
    const definition = createBlockletAgentDefinition(options);

    return new BlockletAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: BlockletAgentDefinition,
    @inject(TYPES.context) public context?: Context<State>
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const {
      definition: { openapiId },
      context,
    } = this;

    if (!openapiId) throw new Error('OpenAPI id is required');
    this.promise ??= getBlockletAgent();
    const { agentsMap } = await this.promise;
    const agent = agentsMap[openapiId];
    if (!agent) throw new Error('Blocklet agent not found');
    if (!agent.openApi) throw new Error('Blocklet agent api not found.');

    const response = await callBlockletApi(agent.openApi, input || {}, { user: context?.state.user });
    const result = response.data;

    return options?.stream ? objectToRunnableResponseStream(result) : (result as O);
  }
}

export function createBlockletAgentDefinition<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
>(options: { id?: string; name?: string; inputs: I; outputs: O; openapiId: string }): BlockletAgentDefinition {
  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'blocklet_agent',
    inputs: schemaToDataType(options.inputs),
    outputs: schemaToDataType(options.outputs),
    openapiId: options.openapiId,
  };
}

export interface BlockletAgentDefinition extends RunnableDefinition {
  type: 'blocklet_agent';
  openapiId: string;
}

type OpenAPIResponseSchema = {
  type: string;
  properties?: { [key: string]: OpenAPIResponseSchema };
  items?: OpenAPIResponseSchema;
};

function convertSchemaToVariableType(schema: OpenAPIResponseSchema): any {
  switch (schema.type) {
    case 'string':
      return { type: 'string', defaultValue: '' };
    case 'integer':
    case 'number':
      return { type: 'number', defaultValue: undefined };
    case 'boolean':
      return { type: 'boolean', defaultValue: undefined };
    case 'object':
      return {
        type: 'object',
        properties: schema.properties
          ? Object.entries(schema.properties).map(([key, value]) => ({
              id: key,
              name: key,
              ...convertSchemaToVariableType(value),
            }))
          : [],
      };
    case 'array':
      return {
        type: 'array',
        element: schema.items ? convertSchemaToVariableType(schema.items) : undefined,
      };
    default:
      throw new Error(`Unsupported schema type: ${schema.type}`);
  }
}

type GetAgentResult = {
  type: 'blocklet';
  id: string;
  name?: string;
  description?: string;
  openApi: DatasetObject;
};

const getBlockletAgent = async () => {
  let list = {};
  try {
    const result = await axios.get(joinURL(config.env.appUrl, '/.well-known/service/openapi.json'));
    list = result.data;
  } catch (error) {
    list = {};
  }

  const openApis = [...flattenApiStructure(list as any)];

  const agents: GetAgentResult[] = openApis.map((i) => {
    const properties = i?.responses?.['200']?.content?.['application/json']?.schema?.properties || {};

    return {
      type: 'blocklet',
      id: i.id,
      name: i?.summary,
      description: i?.description,
      outputVariables: Object.entries(properties).map(([key, value]: any) => ({
        id: key,
        name: key,
        ...convertSchemaToVariableType(value),
      })),
      openApi: i,
    };
  });

  const agentsMap = agents.reduce(
    (acc, cur) => {
      acc[cur.id] = cur;
      return acc;
    },
    {} as { [key: string]: GetAgentResult }
  );

  return { agents, agentsMap, openApis };
};

import { DatasetObject } from '@blocklet/dataset-sdk/types';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import axios, { isAxiosError } from 'axios';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';
import { joinURL } from 'ufo';

import { AuthConfig } from './api-auth';
import { FormatMethod, InputDataTypeSchema, formatRequest } from './api-parameters';
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

  static create<I extends { [name: string]: InputDataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
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
      definition: { openapiId, auth, inputs },
    } = this;

    if (!openapiId) throw new Error('OpenAPI id is required');
    this.promise ??= getBlockletAgent();
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
    console.log('request', request);

    try {
      const response = await axios({
        url: request.url,
        method: request.method,
        params: request.query,
        data: request.body,
        headers: request.headers,
        ...(request.cookies ? { ...request.cookies, withCredentials: true } : {}),
      });

      const result = response.data;
      return options?.stream ? objectToRunnableResponseStream(result) : (result as O);
    } catch (e) {
      if (isAxiosError(e)) {
        Object.assign(e, pick(e.response, 'status', 'statusText', 'data'));
      }
      throw e;
    }
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
  };
}

export interface BlockletAgentDefinition extends RunnableDefinition {
  type: 'blocklet_agent';
  openapiId: string;
  auth?: AuthConfig;
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
};

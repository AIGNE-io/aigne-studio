import axios, { isAxiosError } from 'axios';
import Cookie from 'js-cookie';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { API, InputDataTypeSchema, formatRequest } from './api-parameters';
import { TYPES } from './constants';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './data-type-schema';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { objectToRunnableResponseStream } from './utils';

@injectable()
export class APIAgent<I extends {} = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends { [name: string]: InputDataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
    options: Parameters<typeof createAPIAgentDefinition<I, O>>[0]
  ): APIAgent<SchemaMapType<I>, SchemaMapType<O>> {
    const definition = createAPIAgentDefinition(options);

    return new APIAgent(definition);
  }

  constructor(@inject(TYPES.definition) public override definition: APIAgentDefinition) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const {
      definition: { api, inputs },
    } = this;

    if (!api.url) throw new Error('API url is required');

    const request = formatRequest(api, inputs, input);

    try {
      const response = await axios({
        url: request.url,
        method: request.method,
        params: request.query,
        data: request.body,
        headers: {
          'x-csrf-token': Cookie.get('x-csrf-token'),
          ...(request.headers || {}),
        },
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

import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import type { Context } from './context';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './data-type-schema';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { objectToRunnableResponseStream, runnableResponseStreamToObject } from './utils';

@injectable()
export class LocalFunctionAgent<I extends {} = {}, O extends {} = {}, State = {}> extends Runnable<I, O> {
  static create<I extends { [name: string]: DataTypeSchema }, O extends { [name: string]: DataTypeSchema }, State = {}>(
    options: Parameters<typeof createLocalFunctionAgentDefinition<I, O, State>>[0]
  ): LocalFunctionAgent<SchemaMapType<I>, SchemaMapType<O>, State> {
    const definition = createLocalFunctionAgentDefinition<I, O, State>(options);

    return new LocalFunctionAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: LocalFunctionAgentDefinition<I, O, State>,
    @inject(TYPES.context) public context?: Context<State>
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const {
      definition: { function: func },
      context,
    } = this;

    if (!func) throw new Error('Function is required');
    if (!context) throw new Error('Context is required');

    const result = (await func(input, { context })) as O;

    // TODO: validate the result against the definition.outputs

    return options?.stream
      ? result instanceof ReadableStream
        ? result
        : objectToRunnableResponseStream(result)
      : result instanceof ReadableStream
        ? runnableResponseStreamToObject(result)
        : result;
  }
}

export function createLocalFunctionAgentDefinition<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  State = {},
>(options: {
  id?: string;
  name?: string;
  inputs: I;
  outputs: O;
  function?: (
    input: SchemaMapType<I>,
    options: { context: Context<State> }
  ) => Promise<RunnableResponse<SchemaMapType<O>>>;
}): LocalFunctionAgentDefinition<SchemaMapType<I>, SchemaMapType<O>, State> {
  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);

  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'local_function_agent',
    inputs,
    outputs,
    function: options.function,
  };
}

export interface LocalFunctionAgentDefinition<I extends {} = {}, O extends {} = {}, State = {}>
  extends RunnableDefinition {
  type: 'local_function_agent';

  function?: (input: I, options: { context: Context<State> }) => Promise<RunnableResponse<O>>;
}

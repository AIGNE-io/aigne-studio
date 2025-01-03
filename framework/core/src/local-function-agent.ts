import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import type { Context } from './context';
import { DataType } from './data-type';
import {
  RunOptions,
  Runnable,
  RunnableDefinition,
  RunnableInput,
  RunnableResponse,
  RunnableResponseStream,
} from './runnable';
import { OrderedRecord, objectToStream, readLatestObjectFromStream } from './utils';

@injectable()
export class LocalFunctionAgent<I extends {} = {}, O extends {} = {}, State = {}> extends Runnable<I, O> {
  static create<I extends {} = {}, O extends {} = {}, State = {}>(
    options: Parameters<typeof createLocalFunctionAgentDefinition<I, O, State>>[0]
  ): LocalFunctionAgent<I, O, State> {
    const definition = createLocalFunctionAgentDefinition(options);

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
        : objectToStream({ delta: result })
      : result instanceof ReadableStream
        ? readLatestObjectFromStream(result)
        : result;
  }
}

export function createLocalFunctionAgentDefinition<I extends {} = {}, O extends {} = {}, State = {}>(options: {
  id?: string;
  name?: string;
  inputs?: { name: string; type: DataType['type']; required?: boolean }[];
  outputs?: { name: string; type: DataType['type']; required?: boolean }[];
  function?: (input: I, options: { context: Context<State> }) => Promise<RunnableResponse<O>>;
}): LocalFunctionAgentDefinition<I, O, State> {
  const inputs: OrderedRecord<RunnableInput> = OrderedRecord.fromArray(
    options.inputs?.map((i) => ({
      id: nanoid(),
      name: i.name,
      type: i.type,
      required: i.required,
    }))
  );

  const outputs: OrderedRecord<RunnableInput> = OrderedRecord.fromArray(
    options.outputs?.map((i) => ({
      id: nanoid(),
      name: i.name,
      type: i.type,
      required: i.required,
    }))
  );

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

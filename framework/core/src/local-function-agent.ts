import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import { DataType } from './data-type';
import { FunctionRunner } from './function-runner';
import {
  RunOptions,
  Runnable,
  RunnableDefinition,
  RunnableInput,
  RunnableResponse,
  RunnableResponseStream,
} from './runnable';
import { OrderedRecord, objectToStream } from './utils';

@injectable()
export class LocalFunctionAgent<I extends {} = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends {} = {}, O extends {} = {}>(
    options: Parameters<typeof createLocalFunctionAgentDefinition<I, O>>[0]
  ): LocalFunctionAgent<I, O> {
    const definition = createLocalFunctionAgentDefinition(options);

    return new LocalFunctionAgent(definition);
  }

  constructor(@inject(TYPES.definition) public definition: LocalFunctionAgentDefinition<I, O>) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const {
      definition: { function: func, ...definition },
    } = this;

    if (!func) throw new Error('Function is required');

    const result = (await func(input)) as O;

    // TODO: validate the result against the definition.outputs

    return options?.stream ? objectToStream({ delta: result }) : result;
  }
}

export function createLocalFunctionAgentDefinition<I extends {} = {}, O extends {} = {}>(options: {
  id?: string;
  name?: string;
  inputs?: { name: string; type: DataType['type']; required?: boolean }[];
  outputs?: { name: string; type: DataType['type']; required?: boolean }[];
  function?: (input: I) => Promise<O>;
}): LocalFunctionAgentDefinition<I, O> {
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

export interface LocalFunctionAgentDefinition<I extends {} = {}, O extends {} = {}> extends RunnableDefinition {
  type: 'local_function_agent';

  function?: (input: I) => Promise<O>;
}

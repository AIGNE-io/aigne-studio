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
export class FunctionAgent<I extends {} = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends {} = {}, O extends {} = {}>(
    options: Parameters<typeof createFunctionAgentDefinition>[0]
  ): FunctionAgent<I, O> {
    const definition = createFunctionAgentDefinition(options);

    return new FunctionAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: FunctionAgentDefinition,
    // TODO: 实现按 language 选择不同的 runner
    @inject(TYPES.functionRunner) public runner?: FunctionRunner
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const {
      definition: { language, code, ...definition },
      runner,
    } = this;

    if (!runner) throw new Error('Function runner is required');

    if (!language || !code) throw new Error('Language and code are required');

    const result = await runner.run({
      name: definition.name || definition.id,
      language,
      code,
      arguments: input,
    });

    // TODO: validate the result against the definition.outputs

    return options?.stream ? objectToStream({ delta: result }) : (result as O);
  }
}

export function createFunctionAgentDefinition(options: {
  id?: string;
  name?: string;
  inputs?: { name: string; type: DataType['type']; required?: boolean }[];
  outputs?: { name: string; type: DataType['type']; required?: boolean }[];
  language: string;
  code: string;
}): FunctionAgentDefinition {
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
    type: 'function_agent',
    inputs,
    outputs,
    language: options.language,
    code: options.code,
  };
}

export interface FunctionAgentDefinition extends RunnableDefinition {
  type: 'function_agent';

  language?: string;

  code?: string;
}

import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './data-type-schema';
import { FunctionRunner } from './function-runner';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { objectToRunnableResponseStream } from './utils';

@injectable()
export class FunctionAgent<I extends {} = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends { [name: string]: DataTypeSchema }, O extends { [name: string]: DataTypeSchema }>(
    options: Parameters<typeof createFunctionAgentDefinition<I, O>>[0]
  ): FunctionAgent<SchemaMapType<I>, SchemaMapType<O>> {
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

    return options?.stream ? objectToRunnableResponseStream(result) : (result as O);
  }
}

export function createFunctionAgentDefinition<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
>(options: {
  id?: string;
  name?: string;
  inputs: I;
  outputs: O;
  language: string;
  code: string;
}): FunctionAgentDefinition {
  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'function_agent',
    inputs: schemaToDataType(options.inputs),
    outputs: schemaToDataType(options.outputs),
    language: options.language,
    code: options.code,
  };
}

export interface FunctionAgentDefinition extends RunnableDefinition {
  type: 'function_agent';

  language?: string;

  code?: string;
}

import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import { FunctionRunner } from './function-runner';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { objectToStream } from './utils';

@injectable()
export class FunctionAgent<I extends { [key: string]: any }, O> extends Runnable<I, O> {
  constructor(
    @inject(TYPES.functionRunner) public functionRunner: FunctionRunner,
    @inject(TYPES.definition) public definition: FunctionAgentDefinition
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const {
      definition: { language, code, ...definition },
      functionRunner: runner,
    } = this;

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

export interface FunctionAgentDefinition extends RunnableDefinition {
  type: 'function_agent';

  language?: string;

  code?: string;
}

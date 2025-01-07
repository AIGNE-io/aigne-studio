import { Runnable } from './runnable';
import { OrderedRecord } from './utils';

export interface FunctionRunnerInputs {
  name: string;
  language: string;
  code: string;
  arguments?: object;
}

export type FunctionRunnerOutputs = object;

export abstract class FunctionRunner extends Runnable<FunctionRunnerInputs, FunctionRunnerOutputs> {
  constructor() {
    super({
      id: 'function_runner',
      type: 'function_runner',
      name: 'Function Runner',
      description: 'Run a function',
      inputs: OrderedRecord.fromArray([
        { id: 'name', name: 'name', type: 'string', required: true },
        { id: 'language', name: 'language', type: 'string', required: true },
        { id: 'code', name: 'code', type: 'string', required: true },
        { id: 'arguments', name: 'arguments', type: 'object', required: false },
      ]),
      outputs: OrderedRecord.fromArray([
        {
          id: 'result',
          name: 'result',
          type: 'object',
        },
      ]),
    });
  }
}

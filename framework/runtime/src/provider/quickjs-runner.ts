import crypto from 'crypto';

import {
  FunctionRunner,
  FunctionRunnerInputs,
  FunctionRunnerOutputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
  objectToRunnableResponseStream,
} from '@aigne/core';
import { Sandbox } from '@blocklet/quickjs/sandbox';
import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import pick from 'lodash/pick';

export class QuickJSRunner extends FunctionRunner {
  async run(
    input: FunctionRunnerInputs,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<FunctionRunnerOutputs>>;
  async run(input: FunctionRunnerInputs, options?: RunOptions & { stream?: false }): Promise<FunctionRunnerOutputs>;
  async run(input: FunctionRunnerInputs, options?: RunOptions): Promise<RunnableResponse<FunctionRunnerOutputs>> {
    if (input.language !== 'javascript' && input.language !== 'typescript') {
      throw new Error(`Unsupported language ${input.language}`);
    }

    // TODO: respond log to the result stream or the callback in the context
    const { log } = console;

    const global = {
      console: <typeof console>{
        // NOTE: do not return logger.xxx result, it will cause memory leak
        log: (...args) => log(...args),
        info: (...args) => log(...args),
        debug: (...args) => log(...args),
        warn: (...args) => log(...args),
        error: (...args) => log(...args),
      },
      getComponentMountPoint,
      call: (...args: Parameters<typeof call>) => call(...args).then((res) => ({ data: res.data })),
      crypto: { randomInt: crypto.randomInt },
      config: { env: pick(config.env, 'appId', 'appName', 'appDescription', 'appUrl') },
    };

    const allArgs = {
      ...input.arguments,
    };
    const argKeys = Object.keys(allArgs);

    const result = await Sandbox.callFunction({
      code: `\
async function main({${argKeys.join(', ')}) {
  ${input.code}
}
`,
      filename: `${input.name}.js`,
      global,
      functionName: 'main',
      args: [allArgs],
    });

    return options?.stream ? objectToRunnableResponseStream(result) : result;
  }
}

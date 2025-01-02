import dayjs from 'dayjs';
import { createParser } from 'eventsource-parser';
import { joinURL, withQuery } from 'ufo';
import { NodeVM } from 'vm2';

import { logger } from './logger';
import type { SandboxInitOptions } from './sandbox';
import { transpileModule } from './typescript';

export async function runFunctionInVM2(options: SandboxInitOptions & { functionName: string; args?: any[] }) {
  const vm = new NodeVM({
    sandbox: {
      ReadableStream,
      TransformStream,
      TextDecoder,
      TextDecoderStream,
      EventSourceParserStream,
      dayjs,
      joinURL,
      withQuery,
      ...options.global,
    },
  });

  const code = await transpileModule(
    `\
${options.code}

export default ${options.functionName}
`,
    (ts) => ({
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    })
  );

  try {
    logger.debug(`star vm2 sandbox to run function ${options.functionName} from ${options.filename}`);

    const m = await vm.run(code, { filename: options.filename });

    const result = await m.default(...(options.args ?? []));

    logger.debug(`end vm2 sandbox to run function ${options.functionName} from ${options.filename}`, result);

    return result;
  } catch (error) {
    logger.error(`failed to use vm2 sandbox to run function ${options.functionName} from ${options.filename}`, {
      error,
    });
    throw error;
  }
}

class EventSourceParserStream<T> extends TransformStream<any, T> {
  constructor() {
    let parser: ReturnType<typeof createParser> | undefined;

    super({
      start(controller) {
        parser = createParser((event) => {
          if (event.type === 'event') {
            try {
              const json = JSON.parse(event.data) as T;
              controller.enqueue(json);
            } catch (error) {
              console.error('parse chunk error', { error, data: event.data });
            }
          }
        });
      },
      transform(chunk) {
        parser?.feed(chunk);
      },
    });
  }
}

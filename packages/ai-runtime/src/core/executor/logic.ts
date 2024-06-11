import { join } from 'path';
import { ReadableStream, TextDecoderStream } from 'stream/web';

import { EventSourceParserStream } from '@blocklet/ai-kit/api/utils/event-stream';
import { call } from '@blocklet/sdk/lib/component';
import { isNil } from 'lodash';
import { joinURL, withQuery } from 'ufo';
import { NodeVM } from 'vm2';

import { TranspileTs } from '../../builtin/complete';
import { AssistantResponseType, FunctionAssistant } from '../../types';
import { BuiltinModules } from '../assistant/builtin';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class LogicAgentExecutor extends AgentExecutorBase {
  override async process(
    agent: FunctionAssistant & { project: { id: string } },
    { inputs, taskId }: AgentExecutorOptions
  ) {
    if (!agent.code) throw new Error(`Assistant ${agent.id}'s code is empty`);
    const code = await TranspileTs(`\
    export default async function(args) {
      ${agent.code}
    }
    `);

    const args = Object.fromEntries(
      await Promise.all(
        (agent.parameters ?? [])
          .filter((i): i is typeof i & { key: string } => !!i.key)
          .map(async (i) => [i.key, inputs?.[i.key] || i.defaultValue])
      )
    );

    const ctx: { [key: string]: any } = Object.freeze({
      ...this.context,
      user: this.context.user,
      session: { id: this.context.sessionId },
    });

    const vm = new NodeVM({
      console: 'redirect',
      require: {
        external: { modules: ['@blocklet/ai-builtin'], transitive: true },
        mock: BuiltinModules,
      },
      sandbox: {
        context: {
          get: (name: any) => {
            if (isNil(name) || name === '') return undefined;
            let result = ctx?.[name];
            while (typeof result === 'function') {
              result = result();
            }
            return result;
          },
        },
        fetch,
        URL,
        call,
        joinURL,
        withQuery,
        ReadableStream,
        TextDecoderStream,
        EventSourceParserStream,
        ...args,
      },
    });

    vm.on('console.log', (...data) => {
      const logData = data
        .map((datum) => {
          if (typeof datum === 'object') {
            return JSON.stringify(datum, null, 2);
          }
          return JSON.stringify(datum);
        })
        .join('   ');

      this.context.callback?.({
        type: AssistantResponseType.LOG,
        taskId,
        assistantId: agent.id,
        log: logData,
        timestamp: Date.now(),
      });
    });

    const module = await vm.run(code, join(__dirname, 'assistant.js'));
    if (typeof module.default !== 'function')
      throw new Error('Invalid function file: function file must export default function');

    return await module.default();
  }
}

import 'dayjs/locale/zh';
import 'dayjs/locale/ja';

import crypto from 'crypto';
import { join } from 'path';
import { ReadableStream, TextDecoderStream, TransformStream } from 'stream/web';

import { EventSourceParserStream } from '@blocklet/ai-kit/api/utils/event-stream';
import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config, { logger } from '@blocklet/sdk/lib/config';
import dayjs from 'dayjs';
import equal from 'fast-deep-equal';
import Joi from 'joi';
import pick from 'lodash/pick';
import { joinURL, withQuery } from 'ufo';
import { NodeVM, VM } from 'vm2';

import { TranspileTs } from '../../builtin/complete';
import { AssistantResponseType, FunctionAssistant } from '../../types';
import { renderMustacheStream } from '../../types/assistant/mustache/ReadableMustache';
import { BuiltinModules } from '../assistant/builtin';
import { GetAgentResult } from '../assistant/type';
import { geti } from '../utils/geti';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

function parseJSONInVM(str: string) {
  const vm = new VM({});
  return vm.run(`const json = ${str};json`);
}

export class LogicAgentExecutor extends AgentExecutorBase {
  override async process(agent: FunctionAssistant & GetAgentResult, { inputs, taskId }: AgentExecutorOptions) {
    if (!agent.code) throw new Error(`Assistant ${agent.id}'s code is empty`);
    const code = await TranspileTs(`\
    export default async function(args) {
      ${agent.code}
    }
    `);

    const args = Object.fromEntries(
      await Promise.all(
        (agent.parameters ?? [])
          .filter((i): i is typeof i & { key: string } => !!i.key && !i.hidden)
          .map(async (i) => [i.key, inputs?.[i.key] || i.defaultValue])
      )
    );

    const getUserHeader = () => {
      const { user } = this.context;
      return {
        'x-user-did': user?.did,
        'x-user-role': user?.role,
        'x-user-provider': user?.provider,
        'x-user-fullname': user?.fullName && encodeURIComponent(user?.fullName),
        'x-user-wallet-os': user?.walletOS,
      };
    };

    const ctx: { [key: string]: any } = Object.freeze({
      ...this.context,
      user: this.context.user,
      session: { id: this.context.sessionId },
      getUserHeader,
    });

    const $json = (variables: any, ...rest: any[]) => {
      const taggedFn = async (t: TemplateStringsArray, ...rest: any[]) => {
        const template = t.map((s, i) => `${s}${i === t.length - 1 ? '' : rest[i]}`).join('');

        const renderCtx = {
          ...args,
          ...variables,
          ...this.getLocalContext(agent, { inputs }),
          get: () => async (template: string, render: Function) => {
            const s = await render(template);
            return geti(renderCtx, s);
          },
          runAgent: () => async (template: string, render: Function) => {
            const t = parseJSONInVM(template).template;

            const s = await render(template);
            const j = parseJSONInVM(s);
            const { agentId, inputs } = await Joi.object<{ agentId: string; inputs: any }>({
              agentId: Joi.string().required(),
              inputs: Joi.object().pattern(Joi.string(), Joi.any()).required(),
            }).validateAsync(j, { stripUnknown: true });

            const a = await this.context.getAgent({ ...agent.identity, agentId, rejectOnEmpty: true });

            const result = await this.context.execute(a, { taskId: nextTaskId(), parentTaskId: taskId, inputs });
            return renderMessage(t, { ...renderCtx, $result: result });
          },
        };

        const result = renderMustacheStream(template, (enqueue) => ({
          ...renderCtx,
          runAgent: () => enqueue(renderCtx.runAgent()),
        }));

        let object: any;

        for await (const chunk of result) {
          const newObj = parseJSONInVM(chunk);

          // skip if the object is equal
          // TODO: throttle the output
          if (equal(object, newObj)) {
            continue;
          }

          object = newObj;

          try {
            const obj = await this.validateOutputs(agent, { outputs: object, partial: true });

            this.context.callback?.({
              type: AssistantResponseType.CHUNK,
              taskId,
              assistantId: agent.id,
              delta: { object: obj },
            });
          } catch (error) {
            logger.error('validate LLM outputs error', error, object);
          }
        }

        return object;
      };

      // 支持 $json({foo:"xxx"})`` 和 $json`` 两种调用方式
      if (Array.isArray(variables) && Array.isArray((variables as any as TemplateStringsArray).raw)) {
        return taggedFn(variables as any as TemplateStringsArray, ...rest);
      }

      return taggedFn;
    };

    const vm = new NodeVM({
      console: 'redirect',
      require: {
        external: { modules: ['@blocklet/ai-builtin'], transitive: true },
        mock: BuiltinModules,
      },
      sandbox: {
        context: ctx,
        $json,
        fetch,
        URL,
        call,
        runAgent: async ({ agentId, inputs }: { agentId: string; inputs: { [key: string]: any } }) => {
          const a = await this.context.getAgent({ ...agent.identity, agentId, rejectOnEmpty: true });
          return this.context.execute(a, { taskId: nextTaskId(), parentTaskId: taskId, inputs });
        },
        getComponentMountPoint,
        config: { env: pick(config.env, 'appId', 'appName', 'appDescription', 'appUrl') },
        crypto,
        dayjs,
        joinURL,
        withQuery,
        ReadableStream,
        TransformStream,
        TextDecoderStream,
        EventSourceParserStream,
        ...args,
        ...this.getLocalContext(agent, { inputs }),
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

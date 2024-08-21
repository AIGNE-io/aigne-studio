import { hash } from 'crypto';

import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import { call } from '@blocklet/sdk/lib/component';
import { logger } from '@blocklet/sdk/lib/config';
import Joi from 'joi';
import jsonStableStringify from 'json-stable-stringify';
import { isEmpty, isNil, toLower } from 'lodash';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';
import {
  AssistantResponseType,
  ExecutionPhase,
  RuntimeOutputProfile,
  RuntimeOutputVariable,
  Variable,
  outputVariablesToJoiSchema,
} from '../../types';
import { isNonNullable } from '../../utils/is-non-nullable';
import { CallAI, CallAIImage, GetAgent, GetAgentResult, RunAssistantCallback } from '../assistant/type';
import { HISTORY_API_ID, KNOWLEDGE_API_ID, MEMORY_API_ID, getBlockletAgent } from '../utils/get-blocklet-agent';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';

function isPlainObject(value: any): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class ExecutorContext {
  constructor(
    options: Pick<
      ExecutorContext,
      | 'getAgent'
      | 'callAI'
      | 'callAIImage'
      | 'callback'
      | 'getMemoryVariables'
      | 'user'
      | 'sessionId'
      | 'executor'
      | 'entryProjectId'
      | 'getSecret'
      | 'queryCache'
      | 'setCache'
    >
  ) {
    this.getAgent = options.getAgent;
    this.callAI = options.callAI;
    this.callAIImage = options.callAIImage;
    this.callback = options.callback;
    this.getMemoryVariables = options.getMemoryVariables;
    this.user = options.user;
    this.sessionId = options.sessionId;
    this.executor = options.executor;
    this.entryProjectId = options.entryProjectId;
    this.getSecret = options.getSecret;
    this.queryCache = options.queryCache;
    this.setCache = options.setCache;
  }

  getSecret: (args: {
    targetProjectId: string;
    targetAgentId: string;
    targetInputKey: string;
  }) => Promise<{ secret: string }>;

  getAgent: GetAgent;

  callAI: CallAI;

  callAIImage: CallAIImage;

  queryCache: (options: {
    blockletDid?: string;
    projectId: string;
    projectRef?: string;
    agentId: string;
    cacheKey: string;
  }) => Promise<{
    inputs: { [key: string]: any };
    outputs: { [key: string]: any };
  } | null>;

  setCache: (options: {
    blockletDid?: string;
    projectId: string;
    projectRef?: string;
    agentId: string;
    cacheKey: string;
    inputs: { [key: string]: any };
    outputs: { objects: any[] };
  }) => Promise<any>;

  callback: RunAssistantCallback;

  sessionId: string;

  promise?: Promise<{
    agents: (GetAgentResult & { openApi: DatasetObject })[];
    agentsMap: { [key: string]: GetAgentResult & { openApi: DatasetObject } };
    openApis: DatasetObject[];
  }>;

  entryProjectId: string;

  user: {
    id: string;
    did: string;
    role?: string;
    fullName?: string;
    provider?: string;
    walletOS?: string;
    isAdmin?: boolean;
  };

  getMemoryVariables: (options: {
    blockletDid?: string;
    projectId: string;
    projectRef?: string;
    working?: boolean;
  }) => Promise<Variable[]>;

  maxRetries = 5;

  executor: (context?: ExecutorContext) => AgentExecutorBase;

  async execute(...args: Parameters<AgentExecutorBase['execute']>) {
    return this.executor(this).execute(...args);
  }

  copy(options: Partial<ExecutorContext>) {
    return new ExecutorContext({ ...this, ...options });
  }

  async getBlockletAgent(agentId: string) {
    this.promise ??= getBlockletAgent();

    const { openApis, agentsMap } = await this.promise;

    return { agent: agentsMap[agentId]!, openApis };
  }
}

export interface AgentExecutorOptions {
  inputs?: { [key: string]: any };
  taskId: string;
  parentTaskId?: string;
  variables?: { [key: string]: any };
}

const getUserHeader = (user: any) => {
  return {
    'x-user-did': user?.did,
    'x-user-role': user?.role,
    'x-user-provider': user?.provider,
    'x-user-fullname': user?.fullName && encodeURIComponent(user?.fullName),
    'x-user-wallet-os': user?.walletOS,
  };
};

export abstract class AgentExecutorBase {
  constructor(public readonly context: ExecutorContext) {}

  abstract process(agent: GetAgentResult, options: AgentExecutorOptions): Promise<any>;

  async execute(agent: GetAgentResult, options: AgentExecutorOptions): Promise<any> {
    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantName: agent.name,
      inputParameters: options.inputs,
    });

    const inputs = await this.prepareInputs(agent, options);

    const partial = await this.validateOutputs(agent, { inputs, partial: true });
    if (!isEmpty(partial)) {
      this.context.callback?.({
        type: AssistantResponseType.CHUNK,
        taskId: options.taskId,
        assistantId: agent.id,
        delta: { object: partial },
      });
    }

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantId: agent.id,
      assistantName: agent.name,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
    });

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantName: agent.name,
      inputParameters: inputs,
    });

    let result: any;

    // query cache if the agent has cache enabled
    const cacheKey = this.cacheKey(agent, { inputs: options.inputs || {} });
    if (agent.cache?.enable && agent.identity) {
      try {
        const cache = await this.context.queryCache({ ...agent.identity, cacheKey });
        result = await this.validateOutputs(agent, { inputs, outputs: cache?.outputs });
        if (isEmpty(result)) result = undefined;
      } catch (error) {
        logger.error('query and validate cache error', { error });
      }

      if (typeof result?.$text === 'string') {
        this.context.callback?.({
          type: AssistantResponseType.CHUNK,
          taskId: options.taskId,
          assistantId: agent.id,
          delta: { content: result.$text },
        });
      }
    }

    if (result === undefined) {
      const outputs = await this.process(agent, { ...options, inputs });
      result = await this.validateOutputs(agent, { inputs, outputs });

      // set cache if needed
      if (!isEmpty(result) && agent.cache?.enable && agent.identity) {
        await this.context.setCache({ ...agent.identity, cacheKey, inputs, outputs: result });
      }
    }

    await this.postProcessOutputs(agent, { outputs: result });

    this.context.callback?.({
      type: AssistantResponseType.CHUNK,
      taskId: options.taskId,
      assistantId: agent.id,
      delta: { object: result },
    });

    if (options.parentTaskId) {
      this.context.callback?.({
        type: AssistantResponseType.CHUNK,
        taskId: options.taskId,
        assistantId: agent.id,
        delta: { content: JSON.stringify(result) },
      });
    }

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantId: agent.id,
      assistantName: agent.name,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    return result;
  }

  private cacheKey(agent: GetAgentResult, { inputs }: { inputs: { [key: string]: any } }) {
    // TODO: support custom cache key by specifying inputs of agent
    const i = Object.fromEntries(
      (agent.parameters ?? [])
        .filter((i): i is typeof i & { key: string } => !!i.key && !i.hidden)
        .map((i) => [i.key, inputs[i.key]])
    );

    return hash('md5', jsonStableStringify(i), 'hex');
  }

  private async prepareInputs(agent: GetAgentResult, { inputs, taskId, variables }: AgentExecutorOptions) {
    const inputParameters = Object.fromEntries(
      await Promise.all(
        (agent.parameters || [])
          .filter((i): i is typeof i & { key: string } => !!i.key && i.type !== 'source' && !i.hidden)
          .map(async (i) => {
            const inputValue = inputs?.[i.key!];

            if (typeof inputValue === 'string') {
              const template = String(inputValue || '').trim();
              return [i.key, template ? await renderMessage(template, variables, { stringify: false }) : inputValue];
            }

            if (isPlainObject(inputValue)) {
              const resolvedEntries = await Promise.all(
                Object.entries(inputValue).map(async ([key, value]: any) => {
                  return [key, await renderMessage(value, variables)];
                })
              );

              return [i.key, Object.fromEntries(resolvedEntries)];
            }

            if (Array.isArray(inputValue) && inputValue.length) {
              const resolvedArray = await Promise.all(
                inputValue.map(async (item: any) => {
                  if (isPlainObject(item)) {
                    return Object.fromEntries(
                      await Promise.all(
                        Object.entries(item).map(async ([key, value]: any) => [
                          key,
                          await renderMessage(value, variables),
                        ])
                      )
                    );
                  }

                  return await renderMessage(item, variables);
                })
              );

              return [i.key, resolvedArray];
            }

            return [i.key, variables?.[i.key!] || inputs?.[i.key!]];
          }) ?? []
      )
    );
    const inputVariables: { [key: string]: any } = { ...(inputs || {}), ...inputParameters };

    const partial = await this.validateOutputs(agent, { inputs: inputVariables, partial: true });
    if (!isEmpty(partial)) {
      this.context.callback?.({
        type: AssistantResponseType.CHUNK,
        taskId,
        assistantId: agent.id,
        delta: { object: partial },
      });
    }

    const { callback } = this.context;

    const cb: (taskId: string) => RunAssistantCallback = (taskId) => (args) => {
      if (args.type === AssistantResponseType.CHUNK && args.taskId === taskId) {
        callback({ ...args });
        return;
      }
      callback(args);
    };

    const parameters = (agent.parameters || []).filter((i) => !i.hidden);
    for (const parameter of parameters) {
      if (!parameter.key) continue;

      if (parameter.type === 'source') {
        if (!agent.project) {
          throw new Error('Agent project not found.');
        }

        if (!agent.identity) {
          throw new Error('Agent identity not found.');
        }

        if (parameter.source?.variableFrom === 'secret') {
          const secret =
            inputs?.[parameter.key] ||
            (
              await this.context.getSecret({
                targetProjectId: agent.project.id,
                targetAgentId: agent.id,
                targetInputKey: parameter.key!,
              })
            ).secret;
          if (!secret) throw new Error(`Missing required agent secret ${parameter.key}`);
          inputVariables[parameter.key!] = secret;
        } else if (parameter.source?.variableFrom === 'tool' && parameter.source.agent) {
          const currentTaskId = nextTaskId();
          const { agent: tool } = parameter.source;

          const toolAgent = await this.context.getAgent({
            blockletDid: tool.blockletDid || agent.identity.blockletDid,
            projectId: tool.projectId || agent.identity.projectId,
            projectRef: agent.identity.projectRef,
            agentId: tool.id,
            working: agent.identity.working,
          });
          if (!toolAgent) continue;

          const result = await this.context.executor(this.context).execute(toolAgent, {
            inputs: tool.parameters,
            variables: { ...inputParameters, ...inputVariables },
            taskId: currentTaskId,
            parentTaskId: taskId,
          });

          inputVariables[parameter.key] = result ?? parameter.defaultValue;
        } else if (parameter.source?.variableFrom === 'datastore') {
          const currentTaskId = nextTaskId();
          const key = toLower(parameter.source.variable?.key) || toLower(parameter.key);
          const scope = parameter.source.variable?.scope || 'session';

          const blocklet = await this.context.getBlockletAgent(MEMORY_API_ID);
          if (!blocklet.agent) {
            throw new Error('Blocklet agent api not found.');
          }

          const data = await this.context.executor(this.context).execute(blocklet.agent, {
            inputs: {
              projectId: this.context.entryProjectId,
              sessionId: this.context.sessionId,
              scope,
              key,
            },
            taskId: currentTaskId,
            parentTaskId: taskId,
          });

          const m = await this.context.getMemoryVariables(agent.identity);
          const list = (data.datastores || []).map((x: any) => x?.data).filter((x: any) => x);
          const storageVariable = m.find((x) => toLower(x.key || '') === toLower(key || '') && x.scope === scope);
          let result = (list?.length > 0 ? list : [storageVariable?.defaultValue]).filter((x: any) => x);
          if (storageVariable?.reset) {
            result = (result?.length > 1 ? result : result[0]) ?? '';
          }

          inputVariables[parameter.key] = JSON.stringify(result) ?? parameter.defaultValue;
        } else if (parameter.source?.variableFrom === 'knowledge' && parameter.source.knowledge) {
          const currentTaskId = nextTaskId();
          const tool = parameter.source.knowledge;
          const blockletDid = parameter.source.knowledge.blockletDid || agent.identity.blockletDid;

          const blocklet = await this.context.getBlockletAgent(KNOWLEDGE_API_ID);
          if (!blocklet.agent) {
            throw new Error('Blocklet agent api not found.');
          }

          const data = await this.context
            .executor({ ...this.context, callback: cb(currentTaskId) } as ExecutorContext)
            .execute(blocklet.agent, {
              inputs: tool?.parameters,
              variables: { ...inputVariables, blockletDid, datasetId: tool.id },
              taskId: currentTaskId,
              parentTaskId: taskId,
            });

          inputVariables[parameter.key] = JSON.stringify(data?.docs || []) ?? parameter.defaultValue;
        } else if (parameter.source?.variableFrom === 'history' && parameter.source.chatHistory) {
          const currentTaskId = nextTaskId();
          const chat = parameter.source.chatHistory;

          const blocklet = await this.context.getBlockletAgent(HISTORY_API_ID);
          if (!blocklet.agent) {
            throw new Error('Blocklet agent api not found.');
          }

          const result = await this.context.executor(this.context).execute(blocklet.agent, {
            inputs: {
              sessionId: this.context.sessionId,
              limit: chat.limit || 50,
              keyword: await renderMessage(chat.keyword || '', inputVariables),
            },
            taskId: currentTaskId,
            parentTaskId: taskId,
          });

          const memories: { role: string; content: string; agentId?: string }[] = Array.isArray(result?.messages)
            ? result.messages
            : [];
          const agentIds = new Set(memories.map((i) => i.agentId).filter(isNonNullable));
          const assistantNameMap = Object.fromEntries(
            (
              await Promise.all(
                [...agentIds].map((agentId) =>
                  this.context.getAgent({ ...agent.identity, agentId }).catch((error) => {
                    logger.error('get assistant in conversation history error', { error });
                    return null;
                  })
                )
              )
            )
              .filter(isNonNullable)
              .map((i) => [
                i.id,
                (
                  i.outputVariables?.find((j) => j.name === RuntimeOutputVariable.profile)
                    ?.initialValue as RuntimeOutputProfile
                )?.name ||
                  i.name ||
                  i.id,
              ])
          );

          inputVariables[parameter.key] = memories.map((i) => ({
            ...i,
            name: i.agentId && assistantNameMap[i.agentId],
          }));
        } else if (parameter.source?.variableFrom === 'blockletAPI' && parameter.source.api) {
          const currentTaskId = nextTaskId();

          const blocklet = await this.context.getBlockletAgent(parameter.source.api.id);
          if (!blocklet.agent) {
            throw new Error('Blocklet agent api not found.');
          }

          const result = await this.context
            .executor({ ...this.context, callback: cb?.(currentTaskId) } as ExecutorContext)
            .execute(blocklet.agent, {
              inputs: parameter.source.api.parameters,
              variables: inputVariables,
              taskId: currentTaskId,
              parentTaskId: taskId,
            });

          inputVariables[parameter.key] = result;
        }
      } else if (['llmInputMessages', 'llmInputTools', 'llmInputToolChoice'].includes(parameter.type!)) {
        const v = inputs?.[parameter.key];
        const tryParse = (s: string) => {
          try {
            return JSON.parse(s);
          } catch {
            // ignore
          }
          return undefined;
        };

        const schema = {
          llmInputMessages: Joi.array().items(
            Joi.object({
              role: Joi.string().valid('system', 'user', 'assistant').empty([null, '']).default('user'),
              content: Joi.string().required(),
              name: Joi.string().empty([null, '']),
            })
          ),
          llmInputTools: Joi.array()
            .items(
              Joi.object({
                type: Joi.string().valid('function').required(),
                function: Joi.object({
                  name: Joi.string().required(),
                  description: Joi.string().empty([null, '']),
                  parameters: Joi.object().pattern(Joi.string(), Joi.any()).required(),
                }).required(),
              })
            )
            .empty(Joi.array().length(0)),
          llmInputToolChoice: Joi.alternatives()
            .try(
              Joi.string().valid('auto', 'none', 'required'),
              Joi.object({
                type: Joi.string().valid('function').required(),
                function: Joi.object({
                  name: Joi.string().required(),
                  description: Joi.string(),
                }).required(),
              })
            )
            .empty([null, ''])
            .optional(),
        }[parameter.type as string]!;

        const val =
          parameter.type === 'llmInputMessages'
            ? await schema.validateAsync(
                (Array.isArray(v) ? v : tryParse(v)) ?? [
                  { role: 'user', content: typeof v === 'string' ? v : JSON.stringify(v) },
                ],
                { stripUnknown: true }
              )
            : parameter.type === 'llmInputTools'
              ? await schema.validateAsync(Array.isArray(v) ? v : tryParse(v), { stripUnknown: true })
              : parameter.type === 'llmInputToolChoice'
                ? await schema.validateAsync(tryParse(v) || v, { stripUnknown: true })
                : undefined;

        inputVariables[parameter.key] = val;
      } else if (parameter.type === 'boolean') {
        inputVariables[parameter.key] = Boolean(inputVariables[parameter.key] || parameter.defaultValue);
      } else if (parameter.type === 'number') {
        inputVariables[parameter.key] = Number(inputVariables[parameter.key] || parameter.defaultValue);
      } else {
        inputVariables[parameter.key] ??= parameter.defaultValue;
      }
    }

    return inputVariables;
  }

  protected async validateOutputs(
    agent: GetAgentResult,
    {
      inputs,
      outputs,
      partial,
    }: { inputs?: { [key: string]: any }; outputs?: { [key: string]: any }; partial?: boolean }
  ) {
    const joiSchema = outputVariablesToJoiSchema(agent, {
      partial,
      variables: agent.identity ? await this.context.getMemoryVariables(agent.identity) : [],
    });
    const outputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);

    const outputInputs = outputVariables.reduce((res, output) => {
      const input =
        output.from?.type === 'input'
          ? agent.parameters?.find((input) => input.id === output.from?.id && !input.hidden)
          : undefined;

      if (input?.key && output.name) {
        const val = inputs?.[input.key];
        if (!isNil(val)) return { ...res, [output.name]: val };
      }

      return res;
    }, {});

    return joiSchema.validateAsync({ ...outputs, ...outputInputs }, { stripUnknown: true });
  }

  private async postProcessOutputs(agent: GetAgentResult, { outputs }: { outputs: { [key: string]: any } }) {
    const memoryVariables = agent.identity ? await this.context.getMemoryVariables(agent.identity) : [];
    const outputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);

    for (const output of outputVariables) {
      if (!output?.variable?.key || !output?.name) continue;

      const value = outputs[output.name];
      if (isNil(value)) continue;

      const variable = memoryVariables.find(
        (x) => toLower(x.key || '') === toLower(output.variable?.key || '') && x.scope === output.variable?.scope
      );

      const params = {
        params: {
          projectId: this.context.entryProjectId,
          sessionId: this.context.sessionId,
          agentId: agent.id,
          reset: variable?.reset,
        },
        data: {
          data: value,
          key: toLower(output.variable.key),
          scope: output.variable.scope,
        },
      };

      // TODO: @li-yechao 封装存储数据的方法
      await call({
        name: AIGNE_RUNTIME_COMPONENT_DID,
        path: '/api/memories',
        method: 'POST',
        headers: getUserHeader(this.context.user),
        ...params,
      });
    }
  }
}

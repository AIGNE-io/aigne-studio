import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import { call } from '@blocklet/sdk/lib/component';
import config, { logger } from '@blocklet/sdk/lib/config';
import axios from 'axios';
import Joi from 'joi';
import { isNil, toLower } from 'lodash';
import { joinURL } from 'ufo';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';
import {
  AssistantResponseType,
  ExecutionPhase,
  RuntimeOutputProfile,
  RuntimeOutputVariable,
  StringParameter,
  Variable,
  outputVariablesToJoiSchema,
} from '../../types';
import { CallAI, CallAIImage, GetAgent, GetAgentResult, RunAssistantCallback } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { runKnowledgeTool, runRequestHistory, runRequestStorage } from './blocklet';

type OpenAPIResponseSchema = {
  type: string;
  properties?: { [key: string]: OpenAPIResponseSchema };
  items?: OpenAPIResponseSchema;
};

function convertSchemaToVariableType(schema: OpenAPIResponseSchema): any {
  switch (schema.type) {
    case 'string':
      return { type: 'string', defaultValue: '' };
    case 'number':
      return { type: 'number', defaultValue: 0 };
    case 'boolean':
      return { type: 'boolean', defaultValue: false };
    case 'object':
      return {
        type: 'object',
        properties: schema.properties
          ? Object.entries(schema.properties).map(([key, value]) => ({
              key,
              ...convertSchemaToVariableType(value),
            }))
          : [],
      };
    case 'array':
      return {
        type: 'array',
        element: schema.items ? convertSchemaToVariableType(schema.items) : undefined,
      };
    default:
      throw new Error(`Unsupported schema type: ${schema.type}`);
  }
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
  }

  getSecret: (args: {
    targetProjectId: string;
    targetAgentId: string;
    targetInputKey: string;
  }) => Promise<{ secret: string }>;

  getAgent: GetAgent;

  callAI: CallAI;

  callAIImage: CallAIImage;

  callback: RunAssistantCallback;

  sessionId: string;

  entryProjectId: string;

  user: { id: string; did: string };

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
}

export interface AgentExecutorOptions {
  inputs?: { [key: string]: any };
  taskId: string;
  parentTaskId?: string;
  parameters?: { [key: string]: any };
}

export abstract class AgentExecutorBase {
  constructor(public readonly context: ExecutorContext) {}

  abstract process(agent: GetAgentResult, options: AgentExecutorOptions): Promise<any>;

  async getBlockletAgent(agentId: string, agent: GetAgentResult) {
    const blockletAgent: {
      type: 'blocklet';
      id: string;
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      updatedBy: string;
    } & GetAgentResult = {
      type: 'blocklet',
      id: agentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: this.context.user?.did || '',
      updatedBy: this.context.user?.did || '',

      project: agent.project,
      identity: agent.identity,
    };
    const result = await axios.get(joinURL(config.env.appUrl, '/.well-known/service/openapi.json'));

    if (result.status !== 200) {
      throw new Error('Failed to get agent result');
    }

    const openApis = flattenApiStructure(result.data);
    const agents = openApis.map((i) => {
      const properties = i?.responses?.['200']?.content?.['application/json']?.schema?.properties || {};

      return {
        ...blockletAgent,
        name: i?.summary,
        description: i?.description,
        parameters: getAllParameters(i)
          .map((i) => {
            return {
              id: nextTaskId(),
              type: 'string',
              key: i.name,
            };
          })
          .filter((i) => i.key) as StringParameter[],
        outputVariables: Object.entries(properties).map(([key, value]: any) => ({
          id: key,
          name: key,
          ...convertSchemaToVariableType(value),
        })),
      };
    });

    const foundIndex = openApis.findIndex((x) => x.id === agentId);
    return {
      agent: agents[foundIndex],
      api: openApis[foundIndex],
      openApis,
    };
  }

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

    const outputs = await this.process(agent, { ...options, inputs });

    const result = await this.validateOutputs(agent, { inputs, outputs });

    await this.postProcessOutputs(agent, { outputs: result });

    this.context.callback?.({
      type: AssistantResponseType.CHUNK,
      taskId: options.taskId,
      assistantId: agent.id,
      delta: { object: result },
    });

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

  private async prepareInputs(agent: GetAgentResult, { inputs, taskId }: AgentExecutorOptions) {
    const variables: { [key: string]: any } = { ...inputs };

    const userId = this.context.user.did;

    const { callback } = this.context;

    const cb: (taskId: string) => RunAssistantCallback = (taskId) => (args) => {
      if (args.type === AssistantResponseType.CHUNK && args.taskId === taskId) {
        callback({ ...args });
        return;
      }
      callback(args);
    };

    for (const parameter of agent.parameters || []) {
      if (parameter.key && parameter.type === 'source') {
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
          variables[parameter.key!] = secret;
        } else if (parameter.source?.variableFrom === 'tool' && parameter.source.agent) {
          const { agent: tool } = parameter.source;
          const toolAssistant = await this.context.getAgent({
            blockletDid: tool.blockletDid || agent.identity.blockletDid,
            projectId: tool.projectId || agent.identity.projectId,
            projectRef: agent.identity.projectRef,
            agentId: tool.id,
            working: agent.identity.working,
          });
          if (!toolAssistant) continue;

          const currentTaskId = nextTaskId();

          const args = Object.fromEntries(
            await Promise.all(
              (toolAssistant.parameters ?? [])
                .filter((i): i is typeof i & { key: string } => !!i.key && i.type !== 'source')
                .map(async (i) => {
                  const template = String(tool.parameters?.[i.key] || '').trim();
                  const value = template ? await renderMessage(template, inputs) : inputs?.[i.key];
                  return [i.key, value];
                })
            )
          );

          const result = await this.context.executor(this.context).execute(toolAssistant, {
            inputs: args,
            taskId: currentTaskId,
            parentTaskId: taskId,
          });

          variables[parameter.key] = result ?? parameter.defaultValue;
        } else if (parameter.source?.variableFrom === 'datastore') {
          // eslint-disable-next-line no-await-in-loop
          const result = await runRequestStorage({
            assistant: agent,
            parentTaskId: taskId,
            user: this.context.user,
            callback: this.context.callback,
            datastoreParameter: parameter,
            ids: {
              userId,
              projectId: this.context.entryProjectId,
              sessionId: this.context.sessionId,
              agentId: agent.id,
            },
            memoryVariables: await this.context.getMemoryVariables(agent.identity),
          });

          variables[parameter.key] = result;
        } else if (parameter.source?.variableFrom === 'knowledge' && parameter.source.knowledge) {
          const currentTaskId = nextTaskId();
          // eslint-disable-next-line no-await-in-loop
          const result = await runKnowledgeTool({
            blockletDid: parameter.source.knowledge.blockletDid || agent.identity.blockletDid,
            tool: parameter.source.knowledge,
            taskId: currentTaskId,
            assistant: agent,
            parameters: inputs,
            parentTaskId: taskId,
            callback: cb(currentTaskId),
            user: this.context.user,
          });

          variables[parameter.key] = result ?? parameter.defaultValue;
        } else if (parameter.source?.variableFrom === 'history' && parameter.source.chatHistory) {
          const result = await runRequestHistory({
            assistant: agent,
            parentTaskId: taskId,
            user: this.context.user,
            callback: this.context.callback,
            params: {
              sessionId: this.context.sessionId,
              userId: this.context.user.did,
              limit: parameter.source.chatHistory.limit || 50,
              keyword: await renderMessage(parameter.source.chatHistory.keyword || '', variables),
            },
          });

          const memories = Array.isArray(result) ? result : [];
          const agentIds = new Set(memories.map((i) => i.agentId).filter((i): i is NonNullable<typeof i> => !!i));
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
              .filter((i): i is NonNullable<typeof i> => !!i)
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

          variables[parameter.key] = memories.map((i) => ({
            ...i,
            name: i.agentId && assistantNameMap[i.agentId],
          }));
        } else if (parameter.source?.variableFrom === 'blockletAPI' && parameter.source.api) {
          const currentTaskId = nextTaskId();
          const blocklet = await this.getBlockletAgent(parameter.source.api.id, agent);
          if (!blocklet.agent) {
            throw new Error('Blocklet agent api not found.');
          }

          // eslint-disable-next-line no-await-in-loop
          const result = await this.context
            .executor({ ...this.context, callback: cb?.(currentTaskId) } as ExecutorContext)
            .execute(blocklet.agent, {
              inputs,
              parameters: parameter.source.api.parameters,
              taskId: currentTaskId,
              parentTaskId: taskId,
            });

          variables[parameter.key] = result;
        }
      }

      if (parameter.key && ['llmInputMessages', 'llmInputTools', 'llmInputToolChoice'].includes(parameter.type!)) {
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
                Array.isArray(v)
                  ? v
                  : tryParse(v) ?? [{ role: 'user', content: typeof v === 'string' ? v : JSON.stringify(v) }],
                { stripUnknown: true }
              )
            : parameter.type === 'llmInputTools'
              ? await schema.validateAsync(Array.isArray(v) ? v : tryParse(v), { stripUnknown: true })
              : parameter.type === 'llmInputToolChoice'
                ? await schema.validateAsync(tryParse(v) || v, { stripUnknown: true })
                : undefined;

        variables[parameter.key] = val;
      }
    }

    return variables;
  }

  protected async validateOutputs(
    agent: GetAgentResult,
    { inputs, outputs }: { inputs?: { [key: string]: any }; outputs?: { [key: string]: any } }
  ) {
    const joiSchema = outputVariablesToJoiSchema(agent, await this.context.getMemoryVariables(agent.identity));
    const outputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);

    const outputInputs = outputVariables.reduce((res, output) => {
      const input =
        output.from?.type === 'input' ? agent.parameters?.find((input) => input.id === output.from?.id) : undefined;

      if (input?.key && output.name) {
        const val = inputs?.[input.key];
        if (!isNil(val)) return { ...res, [output.name]: val };
      }

      return res;
    }, {});

    return joiSchema.validateAsync({ ...outputs, ...outputInputs }, { stripUnknown: true });
  }

  private async postProcessOutputs(agent: GetAgentResult, { outputs }: { outputs: { [key: string]: any } }) {
    const memoryVariables = await this.context.getMemoryVariables(agent.identity);
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
          userId: this.context.user.did,
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

export const getUserHeader = (user: any) => {
  return {
    'x-user-did': user?.did,
    'x-user-role': user?.role,
    'x-user-provider': user?.provider,
    'x-user-fullname': user?.fullName && encodeURIComponent(user?.fullName),
    'x-user-wallet-os': user?.walletOS,
  };
};

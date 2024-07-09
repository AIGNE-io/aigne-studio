import crypto from 'crypto';
import { ReadableStream } from 'stream/web';

import {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionResponse,
  isChatCompletionChunk,
  isChatCompletionUsage,
} from '@blocklet/ai-kit/api/types/index';
import { getAllParameters, getRequiredFields } from '@blocklet/dataset-sdk/request/util';
import { call } from '@blocklet/sdk/lib/component';
import { logger } from '@blocklet/sdk/lib/config';
import { isNil } from 'lodash';

import { languages } from '../../constant/languages';
import {
  Assistant,
  AssistantResponseType,
  ExecutionPhase,
  OnTaskCompletion,
  RouterAssistant,
  RuntimeOutputVariable,
  Tool,
} from '../../types';
import selectAgentName from '../assistant/select-agent';
import { GetAgentResult, RunAssistantCallback, ToolCompletionDirective } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { toolCallsTransform } from '../utils/tool-calls-transform';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';

const md5 = (str: string) => crypto.createHash('md5').update(str).digest('hex');

export class DecisionAgentExecutor extends AgentExecutorBase {
  override async process(
    agent: RouterAssistant & GetAgentResult,
    { inputs, taskId, parentTaskId }: AgentExecutorOptions
  ) {
    if (!agent.prompt) {
      throw new Error('Route Assistant Prompt is required');
    }

    const message = await renderMessage(agent.prompt, inputs);
    const routes = agent?.routes || [];

    const blocklet = await this.getBlockletAgent(agent.id, agent);

    logger.info('start get tool function');
    const toolAssistants = (
      await Promise.all(
        routes.map(async (tool) => {
          if (tool?.from === 'blockletAPI') {
            const dataset = (blocklet.openApis || []).find((x) => x.id === tool.id);
            if (!dataset) return undefined;

            const name = tool?.functionName || dataset.summary || dataset.description || '';
            const hashName = md5(name);
            const functionTranslateName = await getEnglishFunctionName({ assistant: agent, hashName, tool, name });
            logger.info('function call api name', functionTranslateName);

            const datasetParameters = getAllParameters(dataset)
              .filter((i): i is typeof i => !!i && !tool.parameters?.[i.name])
              .map((i) => [i.name, { type: 'string', name, description: i.description ?? '' }]);

            const required = getRequiredFields(dataset);

            return {
              tool,
              toolAssistant: dataset,
              function: {
                name: (functionTranslateName || name).replace(/[^a-zA-Z0-9_-]/g, '_')?.slice(0, 64) || dataset.path,
                descriptions: dataset.description || name || '',
                parameters: {
                  type: 'object',
                  properties: Object.fromEntries(datasetParameters),
                  required: required?.length ? required : undefined,
                },
              },
            };
          }

          const toolAssistant = await this.context.getAgent({
            blockletDid: tool.blockletDid || agent.identity.blockletDid,
            projectId: tool.projectId || agent.identity.projectId,
            projectRef: agent.identity.projectRef,
            agentId: tool.id,
            working: agent.identity.working,
          });
          if (!toolAssistant) return undefined;
          const toolParameters = (toolAssistant.parameters ?? [])
            .filter(
              (i): i is typeof i & Required<Pick<typeof i, 'key'>> =>
                !!i.key && !tool.parameters?.[i.key] && i.type !== 'source'
            )
            .map((parameter) => {
              return [
                parameter.key,
                {
                  type: 'string',
                  description: parameter.placeholder ?? '',
                  enum:
                    parameter.type === 'select'
                      ? parameter.options?.map((i) => i.value)
                      : parameter.type === 'language'
                        ? languages.map((i) => i.en)
                        : undefined,
                },
              ];
            });

          const required = (toolAssistant.parameters ?? [])
            .filter((i): i is typeof i & { key: string } => !!i.key && i.type !== 'source')
            .filter((i) => !(tool?.parameters || {})[i.key])
            .filter((x) => x.required)
            .map((x) => x.key);

          const name = tool?.functionName || toolAssistant?.description || toolAssistant?.name || '';
          const hashName = md5(name);
          const functionTranslateName = await getEnglishFunctionName({ assistant: agent, hashName, tool, name });
          logger.info('function call agent name', functionTranslateName);

          return {
            tool,
            toolAssistant,
            function: {
              name: (functionTranslateName || name)?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || toolAssistant.id,
              descriptions: toolAssistant.description,
              parameters: {
                type: 'object',
                properties: Object.fromEntries(toolParameters),
                required: required?.length ? required : undefined,
              },
            },
          };
        })
      )
    ).filter((i): i is NonNullable<typeof i> => !isNil(i));

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
    });

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      assistantName: `${agent.name}`,
      promptMessages: [{ role: 'user', content: message }],
    });

    const runFunctionCall = async ({
      tools,
      toolChoice,
    }: {
      tools: ChatCompletionInput['tools'];
      toolChoice: ChatCompletionInput['toolChoice'];
    }) => {
      logger.info('function call input', {
        model: agent?.model,
        temperature: agent?.temperature,
        topP: agent?.topP,
        presencePenalty: agent?.presencePenalty,
        frequencyPenalty: agent?.frequencyPenalty,
        messages: [{ role: 'user', content: message }],
        tools,
        toolChoice,
      });

      const executor = agent.executor?.agent?.id
        ? await this.context.getAgent({
            blockletDid: agent.executor.agent.blockletDid || agent.identity.blockletDid,
            projectId: agent.executor.agent.projectId || agent.identity.projectId,
            projectRef: agent.identity.projectRef,
            agentId: agent.executor.agent.id,
            working: agent.identity.working,
            rejectOnEmpty: true,
          })
        : undefined;

      const response = executor
        ? ((
            await this.context.executor().execute(executor, {
              taskId: nextTaskId(),
              parentTaskId: taskId,
              inputs: {
                ...inputs,
                ...agent.executor?.inputValues,
                [executor.parameters?.find((i) => i.type === 'llmInputMessages')?.key!]: [
                  { role: 'user', content: message },
                ],
                [executor.parameters?.find((i) => i.type === 'llmInputTools')?.key!]: tools,
                [executor.parameters?.find((i) => i.type === 'llmInputToolChoice')?.key!]: toolChoice,
              },
            })
          )[RuntimeOutputVariable.llmResponseStream] as ReadableStream<ChatCompletionResponse>)
        : await this.context.callAI({
            assistant: agent,
            input: {
              model: agent?.model,
              temperature: agent?.temperature,
              topP: agent?.topP,
              presencePenalty: agent?.presencePenalty,
              frequencyPenalty: agent?.frequencyPenalty,
              messages: [{ role: 'user', content: message }],
              tools,
              toolChoice,
            },
          });

      const calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']> = [];

      for await (const chunk of response) {
        if (isChatCompletionUsage(chunk)) {
          this.context.callback?.({
            type: AssistantResponseType.USAGE,
            taskId,
            assistantId: agent.id,
            usage: chunk.usage,
          });
        }

        if (isChatCompletionChunk(chunk)) {
          toolCallsTransform(calls, chunk);
        }
      }

      return calls;
    };

    const tools: {
      type: 'function';
      function: { name: string; description?: string | undefined; parameters: Record<string, any> };
    }[] = toolAssistants.map((i) => ({
      type: 'function',
      function: {
        name: i.function.name,
        description: i.function.descriptions,
        parameters: i.function.parameters,
      },
    }));

    logger.info('function call tools', JSON.stringify(tools));

    logger.info('call agent function start');
    const calls = await runFunctionCall({
      tools,
      toolChoice: 'required',
    });
    logger.info('call agent function end');

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    const toolAssistantMap = Object.fromEntries(toolAssistants.map((i) => [i.function.name, i]));
    const defaultTool = toolAssistants.find((i) => i.tool.id === agent.defaultToolId);

    const matchAgentName = async () => {
      // requestCalls 没有找到，检查 jsonResult 是否存在
      logger.info('match not call function agent name');

      let selectedAgent: { category_name?: string } = {};
      try {
        const categories = toolAssistants
          .map((x) => x.function.name)
          .filter((x) => x)
          .map((x) => JSON.stringify({ category_name: x }))
          .join(',');

        selectedAgent = await selectAgentName({
          assistant: agent,
          message,
          categories,
          callAI: this.context.callAI,
          maxRetries: this.context.maxRetries,
        });
      } catch (error) {
        logger.error('select agent name failed');
      }

      logger.info('Get Current Selected Agent Name', {
        from: 'ai',
        value: selectedAgent?.category_name,
      });
      if (selectedAgent?.category_name) {
        const found = toolAssistantMap[selectedAgent.category_name];
        if (found) return selectedAgent.category_name;
      }

      logger.info('Get Current Selected Agent Name', {
        from: 'default agent',
        value: agent?.defaultToolId,
      });
      // 使用默认 Agent
      if (agent?.defaultToolId) {
        const found = toolAssistantMap[agent.defaultToolId];
        if (found) return defaultTool?.function.name;
      }

      logger.info('Get Current Selected Agent Name', {
        from: 'from first agent',
        value: toolAssistants[0]?.function.name,
      });
      // 没有找到符合条件的请求，使用默认请求
      return toolAssistants[0]?.function?.name;
    };

    const matchRequestCalls = async () => {
      logger.info('Get Current Selected Agent Name', {
        from: 'function call',
        value: calls && JSON.stringify(calls),
      });

      // 首先检查 call function 返回的值是否存在
      if (calls?.length) {
        const found = calls.find((call) => call.function?.name && toolAssistantMap[call.function?.name]);

        if (found) {
          return [found];
        }
      }

      // TODO: 使用  toolChoice: 'required' 之后，肯定会返回数据，下面会用不到, 先观察一下使用情况
      const agentName = await matchAgentName();
      const tool = toolAssistants.find((x) => x.function.name === agentName);
      if (tool) {
        const defaultCalls = await runFunctionCall({
          tools: [tool].map((i) => ({
            type: 'function',
            function: {
              name: i.function.name,
              description: i.function.descriptions,
              parameters: i.function.parameters,
            },
          })),
          toolChoice: {
            type: 'function',
            function: {
              name: tool.function.name,
              description: tool.function.descriptions,
            },
          },
        });

        if (defaultCalls?.length) {
          const found = defaultCalls.find((call) => call.function?.name && toolAssistantMap[call.function?.name]);
          if (found) {
            return [found];
          }
        }
      }

      return [{ type: 'function', function: { name: agentName, arguments: '{}' } }];
    };

    logger.info('match function name start');
    const requestCalls = await matchRequestCalls();
    logger.info('match function name end');

    const result =
      requestCalls &&
      (await Promise.all(
        requestCalls.map(async (call) => {
          if (!call.function?.name || !call.function.arguments) return undefined;

          const tool = toolAssistantMap[call.function.name];
          if (!tool) return undefined;

          const requestData = JSON.parse(call.function.arguments);
          const currentTaskId = nextTaskId();
          const toolAssistant = tool?.toolAssistant as Assistant;

          const { callback } = this.context;

          const cb: RunAssistantCallback = (args) => {
            callback(args);

            if (args.type === AssistantResponseType.CHUNK && args.taskId === currentTaskId) {
              // called agent 有 text stream && 当前输出也有 text stream, 直接回显 text stream
              if (
                Object.values(toolAssistant?.outputVariables || {}).find(
                  (x) => x.name === RuntimeOutputVariable.text
                ) &&
                Object.values(agent?.outputVariables || {}).find((x) => x.name === RuntimeOutputVariable.text) &&
                args?.delta?.content
              ) {
                callback({ ...args, taskId });
              }
            }
          };

          if (tool.tool.from === 'blockletAPI') {
            const blocklet = await this.getBlockletAgent(tool.tool.id, agent);

            const result = await this.context
              .executor({ ...this.context, callback: cb } as ExecutorContext)
              .execute(blocklet.agent, {
                inputs: { ...inputs, ...requestData },
                parameters: tool.tool.parameters,
                taskId: currentTaskId,
                parentTaskId: taskId,
              });

            return result;
          }

          await Promise.all(
            toolAssistant.parameters?.map(async (item) => {
              const message = tool.tool?.parameters?.[item.key!];
              if (message) {
                requestData[item.key!] = await renderMessage(message, inputs);
              }
            }) ?? []
          );

          const res = await this.context.executor(this.context.copy({ callback: cb })).execute(toolAssistant as any, {
            taskId: currentTaskId,
            parentTaskId: taskId,
            inputs: requestData,
          });

          if (tool.tool?.onEnd === OnTaskCompletion.EXIT) {
            throw new ToolCompletionDirective('The task has been stop. The tool will now exit.', OnTaskCompletion.EXIT);
          }

          return res;
        })
      ));

    const obj = result?.length === 1 ? result[0] : result;

    return obj;
  }
}

const cacheTranslateFunctionNames: { [key: string]: string } = {};

const getEnglishFunctionName = async ({
  assistant,
  hashName,
  tool,
  name,
}: {
  assistant: RouterAssistant;
  hashName?: string;
  tool: Tool;
  name: string;
}) => {
  let functionTranslateName = '';
  if (hashName) {
    if (!cacheTranslateFunctionNames[`${assistant.id}-${tool.id}-${hashName}`]) {
      try {
        const result = await call({
          name: 'ai-kit',
          path: '/api/v1/completions',
          method: 'POST',
          data: {
            stream: false,
            messages: [
              {
                content: `\
                # Roles: You are a translation master. You need to translate the user's input into English.

                # rules:
                - Please do not respond with unnecessary content, only provide the translation.
                - You need to translate any input provided.
                - Your translation should be in camelCase function name format.
                - If the input is already in English, no translation is required.

                # Examples:
                - 测试: test
                - 开始: start
                - weapon: weapon
                - 添加一个新的todo: AddANewTodo
                `,
                role: 'system',
              },
              {
                content: name ?? '',
                role: 'user',
              },
            ],
            model: assistant?.model,
            temperature: assistant?.temperature,
            topP: assistant?.topP,
            presencePenalty: assistant?.presencePenalty,
            frequencyPenalty: assistant?.frequencyPenalty,
          },
        });

        cacheTranslateFunctionNames[`${assistant.id}-${tool.id}-${hashName}`] = result?.data?.content;
      } catch (error) {
        logger.error(error);
      }
    }

    functionTranslateName = cacheTranslateFunctionNames[`${assistant.id}-${tool.id}-${hashName}`] || '';
  }

  return functionTranslateName;
};

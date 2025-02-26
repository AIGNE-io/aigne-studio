import crypto from 'crypto';
import { ReadableStream } from 'stream/web';

import {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionResponse,
  isChatCompletionChunk,
} from '@blocklet/ai-kit/api/types/index';
import { getAllParameters, getRequiredFields } from '@blocklet/dataset-sdk/request/util';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { logger } from '@blocklet/sdk/lib/config';
import { DeepRequired } from 'react-hook-form';

import { parseIdentity, stringifyIdentity } from '../../common/aid';
import { languages } from '../../constant/languages';
import {
  Assistant,
  AssistantResponseType,
  BlockletAgent,
  ExecutionPhase,
  OnTaskCompletion,
  RouterAssistant,
  RuntimeOutputVariable,
  Tool,
  jsonSchemaToOpenAIJsonSchema,
} from '../../types';
import { isNonNullable } from '../../utils/is-non-nullable';
import { RunAssistantCallback, ToolCompletionDirective } from '../assistant/type';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase } from './base';

const md5 = (str: string) => crypto.createHash('md5').update(str).digest('hex');

export class DecisionAgentExecutor extends AgentExecutorBase<RouterAssistant> {
  override async process({ inputs }: { inputs: { [key: string]: any } }) {
    const {
      agent,
      options: { parentTaskId, taskId },
    } = this;

    if (!agent.prompt) {
      throw new Error('prompt is required for decision agent');
    }

    const message = await this.renderMessage(agent.prompt);
    const routes = agent.routes || [];

    const blocklet = await this.context.getBlockletAgent(agent.id);

    const toolAssistants = (
      await Promise.all(
        routes.map(async (tool) => {
          if (tool?.from === 'blockletAPI') {
            const dataset = (blocklet.openApis || []).find((x) => x.id === tool.id);
            if (!dataset) return undefined;

            const name = tool?.functionName || dataset.summary || dataset.description || '';
            const functionTranslateName = await this.normalizeToolFunctionName({ agent, tool, name });
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
                description: dataset.description || name || '',
                parameters: {
                  type: 'object',
                  properties: Object.fromEntries(datasetParameters),
                  required: required?.length ? required : undefined,
                },
              },
            };
          }

          const identity = parseIdentity(agent.identity.aid, { rejectWhenError: true });

          const toolAssistant = await this.context.getAgent({
            aid: stringifyIdentity({
              blockletDid: tool.blockletDid || identity.blockletDid,
              projectId: tool.projectId || identity.projectId,
              projectRef: identity.projectRef,
              agentId: tool.id,
            }),
            working: agent.identity.working,
          });
          if (!toolAssistant) return undefined;
          const toolParameters = (toolAssistant.parameters ?? [])
            .filter(
              (i): i is typeof i & Required<Pick<typeof i, 'key'>> =>
                !!i.key && !tool.parameters?.[i.key] && i.type !== 'source' && !i.hidden
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
            .filter((i): i is typeof i & { key: string } => !!i.key && i.type !== 'source' && !i.hidden)
            .filter((i) => !(tool?.parameters || {})[i.key] && i.required)
            .map((x) => x.key);

          const name = tool?.functionName || toolAssistant?.description || toolAssistant?.name || '';
          const functionTranslateName = await this.normalizeToolFunctionName({ agent, tool, name });
          logger.info('function call agent name', functionTranslateName);

          return {
            tool,
            toolAssistant,
            function: {
              name: (functionTranslateName || name)?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || toolAssistant.id,
              description: name,
              parameters: {
                type: 'object',
                properties: Object.fromEntries(toolParameters),
                required: required?.length ? required : undefined,
              },
            },
          };
        })
      )
    ).filter(isNonNullable);

    const tools: {
      type: 'function';
      function: { name: string; description?: string | undefined; parameters: Record<string, any> };
    }[] = toolAssistants.map((i) => ({
      type: 'function',
      function: {
        name: i.function.name,
        description: i.function.description,
        parameters: i.function.parameters,
      },
    }));

    const { hasJsonOutputs, hasStreamingTextOutput } = await this.outputsInfo;

    const messages: ChatCompletionInput['messages'] = [{ role: 'user', content: message }];
    const result: { $text?: string } = {};

    let jsonPromise: Promise<any> | undefined;

    if (hasStreamingTextOutput) {
      const stream = this.runLLMGetTextOutput({ inputs, messages, tools, toolAssistants, taskId });
      for await (const chunk of stream) {
        result.$text = (result.$text || '') + chunk;
        this.context.callback?.({
          type: AssistantResponseType.CHUNK,
          assistantId: agent.id,
          taskId,
          delta: { content: chunk },
        });
        if (hasJsonOutputs) {
          jsonPromise ??= this.runLLMGetJsonOutput({ inputs, messages, tools, toolAssistants, taskId });
        }
      }
    } else if (hasJsonOutputs) {
      jsonPromise = this.runLLMGetJsonOutput({ inputs, messages, tools, toolAssistants, taskId });
    }

    Object.assign(result, await jsonPromise);

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    return result;
  }

  private async runFunctionCall({
    inputs,
    messages,
    responseFormat,
    tools,
    toolChoice,
  }: {
    inputs: { [key: string]: any };
    messages: ChatCompletionInput['messages'];
    responseFormat?: ChatCompletionInput['responseFormat'];
    tools: ChatCompletionInput['tools'];
    toolChoice: ChatCompletionInput['toolChoice'];
  }) {
    const {
      agent,
      options: { parentTaskId, taskId },
    } = this;

    const identity = parseIdentity(agent.identity.aid, { rejectWhenError: true });

    const executor = agent.executor?.agent?.id
      ? await this.context.getAgent({
          aid: stringifyIdentity({
            blockletDid: agent.executor.agent.blockletDid || identity.blockletDid,
            projectId: agent.executor.agent.projectId || identity.projectId,
            projectRef: identity.projectRef,
            agentId: agent.executor.agent.id,
          }),
          working: agent.identity.working,
          rejectOnEmpty: true,
        })
      : undefined;

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      assistantName: `${agent.name}`,
      promptMessages: messages,
    });

    const input: ChatCompletionInput = {
      model: agent?.model,
      temperature: agent?.temperature,
      topP: agent?.topP,
      presencePenalty: agent?.presencePenalty,
      frequencyPenalty: agent?.frequencyPenalty,
      responseFormat,
      messages,
      tools,
      toolChoice,
    };

    logger.debug('Run decision agent with input', input);

    return executor
      ? ((
          await this.context
            .executor(executor, {
              taskId: nextTaskId(),
              parentTaskId: taskId,
              inputs: {
                ...inputs,
                ...agent.executor?.inputValues,
                [executor.parameters?.find((i) => i.type === 'llmInputMessages' && !i.hidden)?.key!]: messages,
                [executor.parameters?.find((i) => i.type === 'llmInputTools' && !i.hidden)?.key!]: tools,
                [executor.parameters?.find((i) => i.type === 'llmInputToolChoice' && !i.hidden)?.key!]: toolChoice,
                [executor.parameters?.find((i) => i.type === 'llmInputResponseFormat' && !i.hidden)?.key!]:
                  responseFormat,
              },
            })
            .execute()
        )[RuntimeOutputVariable.llmResponseStream] as ReadableStream<ChatCompletionResponse>)
      : await this.context.callAI({
          assistant: agent,
          input,
        });
  }

  private async *runLLMGetTextOutput({
    inputs,
    messages,
    tools,
    toolAssistants,
    taskId,
  }: {
    inputs: { [key: string]: any };
    messages: ChatCompletionInput['messages'];
    tools: ChatCompletionInput['tools'];
    toolAssistants: {
      tool: Tool;
      toolAssistant: Assistant | DatasetObject | BlockletAgent;
      function: { name: string };
    }[];
    taskId: string;
  }): AsyncGenerator<string> {
    for (;;) {
      const stream = await this.runFunctionCall({
        inputs,
        messages,
        tools,
        toolChoice: 'auto',
      });

      let toolCalls: DeepRequired<NonNullable<ChatCompletionChunk['delta']['toolCalls']>> | undefined;

      for await (const chunk of stream) {
        if (isChatCompletionChunk(chunk)) {
          if (chunk.delta.content) {
            yield chunk.delta.content;
          }

          if (chunk.delta.toolCalls?.length) {
            toolCalls = chunk.delta.toolCalls as typeof toolCalls;
          }
        }
      }

      if (toolCalls?.length) {
        const callResult = await this.executeTool({
          agent: this.agent,
          toolAssistants,
          calls: toolCalls,
          inputs,
          taskId,
        });

        messages.push({ role: 'assistant', toolCalls });
        messages.push(...callResult);
      } else {
        break;
      }
    }
  }

  private async runLLMGetJsonOutput({
    inputs,
    messages,
    tools,
    toolAssistants,
    taskId,
  }: {
    inputs: { [key: string]: any };
    messages: ChatCompletionInput['messages'];
    tools: ChatCompletionInput['tools'];
    toolAssistants: {
      tool: Tool;
      toolAssistant: Assistant | DatasetObject | BlockletAgent;
      function: { name: string };
    }[];
    taskId: string;
  }) {
    const { schema } = await this.outputsInfo;

    let text = '';

    for (;;) {
      text = '';

      const stream = await this.runFunctionCall({
        inputs,
        messages,
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'output',
            schema: jsonSchemaToOpenAIJsonSchema(schema),
            strict: true,
          },
        },
        tools,
        toolChoice: 'auto',
      });

      let toolCalls: DeepRequired<NonNullable<ChatCompletionChunk['delta']['toolCalls']>> | undefined;

      for await (const chunk of stream) {
        if (isChatCompletionChunk(chunk)) {
          if (chunk.delta.content) {
            text += chunk.delta.content;
          }
          if (chunk.delta.toolCalls?.length) {
            toolCalls = chunk.delta.toolCalls as typeof toolCalls;
          }
        }
      }

      if (toolCalls?.length) {
        const callResult = await this.executeTool({
          agent: this.agent,
          toolAssistants,
          calls: toolCalls,
          inputs,
          taskId,
        });

        messages.push({ role: 'assistant', toolCalls });
        messages.push(...callResult);
      } else {
        break;
      }
    }

    return JSON.parse(text);
  }

  private async executeTool({
    agent,
    toolAssistants,
    calls,
    inputs,
    taskId,
  }: {
    agent: RouterAssistant;
    toolAssistants: {
      tool: Tool;
      toolAssistant: Assistant | DatasetObject | BlockletAgent;
      function: { name: string };
    }[];
    calls: { id: string; function: { name: string; arguments: string } }[];
    inputs: { [key: string]: any };
    taskId: string;
  }): Promise<
    {
      role: 'tool';
      content: string;
      toolCallId: string;
    }[]
  > {
    const toolAssistantMap = Object.fromEntries(toolAssistants.map((i) => [i.function.name, i]));

    const requestCalls = calls.map((i) => {
      const tool = toolAssistantMap[i.function.name];
      if (!tool) {
        throw new Error(`Tool not found: ${i.function.name}`);
      }
      return {
        call: i,
        tool,
      };
    });

    return await Promise.all(
      requestCalls.map(async ({ tool, call }) => {
        const requestData = JSON.parse(call.function.arguments!);

        const currentTaskId = nextTaskId();
        const toolAssistant = tool?.toolAssistant as Assistant;

        const { callback } = this.context;

        const cb: RunAssistantCallback = (args) => {
          callback(args);

          if (args.type === AssistantResponseType.CHUNK && args.taskId === currentTaskId) {
            // called agent 有 text stream && 当前输出也有 text stream, 直接回显 text stream
            if (
              Object.values(toolAssistant?.outputVariables || {}).find((x) => x.name === RuntimeOutputVariable.text) &&
              Object.values(agent?.outputVariables || {}).find((x) => x.name === RuntimeOutputVariable.text) &&
              args?.delta?.content
            ) {
              callback({ ...args, taskId });
            }
          }
        };

        let result;

        if (tool.tool.from === 'blockletAPI') {
          const blocklet = await this.context.getBlockletAgent(tool.tool.id);
          if (!blocklet.agent) {
            throw new Error('Blocklet agent api not found.');
          }

          result = await this.context
            .copy({ callback: cb })
            .executor(blocklet.agent, {
              inputs: tool.tool.parameters,
              variables: { ...inputs, ...requestData },
              taskId: currentTaskId,
              parentTaskId: taskId,
            })
            .execute();
        } else {
          await Promise.all(
            toolAssistant.parameters
              ?.filter((i) => !i.hidden)
              ?.map(async (item) => {
                const message = tool.tool?.parameters?.[item.key!];
                if (message) {
                  requestData[item.key!] = await this.renderMessage(message);
                }
              }) ?? []
          );

          result = await this.context
            .copy({ callback: cb })
            .executor(toolAssistant as any, {
              taskId: currentTaskId,
              parentTaskId: taskId,
              inputs: requestData,
            })
            .execute();

          if (tool.tool?.onEnd === OnTaskCompletion.EXIT) {
            throw new ToolCompletionDirective('The task has been stop. The tool will now exit.', OnTaskCompletion.EXIT);
          }
        }

        return {
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: call.id,
        };
      })
    );
  }

  private async normalizeToolFunctionName({ agent, tool, name }: { agent: RouterAssistant; tool: Tool; name: string }) {
    if (functionNameRegex.test(name)) return name;

    const key = md5([agent.id, tool.id, tool.functionName, agent.name, agent.description].filter(Boolean).join('/'));

    cacheTranslateFunctionNames[key] ??= this.context
      .callAI({
        input: {
          messages: [
            {
              role: 'system',
              content: `\
  # Role
  You are an engineer who is proficient in programming. Please generate a function \
  name that conforms to programming standards according to the following requirements

  - The name of the function to be called. Must be a-z, A-Z, 0-9, or contain \
  underscores and dashes, with a maximum length of 64.

  # Output
  - Do not explain
  - Directly output the generated function name

  # Context
  - Human readable function name:
    - ${name}
    - ${tool.functionName}
    - ${agent.name}
  - Function description: ${agent.description}
                  `,
            },
          ],
          model: agent?.model,
          temperature: agent?.temperature,
          topP: agent?.topP,
          presencePenalty: agent?.presencePenalty,
          frequencyPenalty: agent?.frequencyPenalty,
        },
      })
      .then(async (stream) => {
        let generated = '';

        for await (const i of stream) {
          if (isChatCompletionChunk(i)) {
            generated += (i.delta.content ?? '').trim();
          }
        }

        if (typeof generated !== 'string' || !functionNameRegex.test(generated)) {
          throw new Error(`Generated function name is invalid: ${generated}`);
        }

        return generated;
      })
      .catch((error) => {
        delete cacheTranslateFunctionNames[key];
        throw error;
      });

    return cacheTranslateFunctionNames[key]!;
  }
}

const cacheTranslateFunctionNames: { [key: string]: Promise<string> } = {};

const functionNameRegex = /^[a-zA-Z0-9_-]{1,64}$/;

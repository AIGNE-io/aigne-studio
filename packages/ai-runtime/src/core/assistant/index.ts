import { ReadableStream } from 'stream/web';

import {
  ChatCompletionChunk,
  ChatCompletionInput,
  ImageGenerationInput,
  ImageGenerationResponse,
} from '@blocklet/ai-kit/api/types';
import { call } from '@blocklet/sdk/lib/component';
import { env } from '@blocklet/sdk/lib/config';
import axios, { isAxiosError } from 'axios';
import { flattenDeep, isNil, pick } from 'lodash';
import fetch from 'node-fetch';
import { Worker } from 'snowflake-uuid';
import { NodeVM } from 'vm2';

import {
  ApiAssistant,
  Assistant,
  ExecuteBlock,
  FunctionAssistant,
  Prompt,
  PromptAssistant,
  isApiAssistant,
  isExecuteBlock,
  isFunctionAssistant,
  isPromptAssistant,
} from '../../types';
import { ImageAssistant, Mustache, Role, isImageAssistant } from '../../types/assistant';
import { defaultImageModel, getSupportedImagesModels } from '../../types/assistant/model';
import { AssistantResponseType, ExecutionPhase, RunAssistantResponse } from '../../types/runtime';

export type RunAssistantCallback = (e: RunAssistantResponse) => void;

export interface GetAssistant {
  (assistantId: string, options: { rejectOnEmpty: true | Error }): Promise<Assistant>;
  (assistantId: string, options?: { rejectOnEmpty?: false }): Promise<Assistant | null>;
}

export type Options = {
  assistant: Assistant;
  input: ChatCompletionInput;
};

export type ModelInfo = {
  model: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
};

// export type CallAI = ({ assistant, input, outputModal }: Options) => Options extends false ? Promise<ReadableStream<ChatCompletionChunk>> :  ;

export interface CallAI {
  (options: Options & { outputModel: true }): Promise<{
    modelInfo: ModelInfo;
    chatCompletionChunk: ReadableStream<ChatCompletionChunk>;
  }>;
  (options: Options & { outputModel?: false }): Promise<ReadableStream<ChatCompletionChunk>>;
  (options: Options & { outputModel: boolean }): any;
}

export type CallAIImage = (options: {
  assistant: Assistant;
  input: ImageGenerationInput;
}) => Promise<ImageGenerationResponse>;

const taskIdGenerator = new Worker();

export const nextTaskId = () => taskIdGenerator.nextId().toString();

export async function runAssistant({
  taskId,
  callAI,
  callAIImage,
  getAssistant,
  assistant,
  parameters = {},
  parentTaskId,
  callback,
}: {
  taskId: string;
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  assistant: Assistant;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}): Promise<any> {
  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
  });

  if (isPromptAssistant(assistant)) {
    return runPromptAssistant({
      taskId,
      callAI,
      callAIImage,
      getAssistant,
      assistant,
      parameters,
      parentTaskId,
      callback,
    });
  }

  if (isImageAssistant(assistant)) {
    return runImageAssistant({
      taskId,
      callAI,
      callAIImage,
      getAssistant,
      assistant,
      parameters,
      parentTaskId,
      callback,
    });
  }

  if (isFunctionAssistant(assistant)) {
    return runFunctionAssistant({
      getAssistant,
      callAI,
      callAIImage,
      taskId,
      assistant,
      parameters,
      parentTaskId,
      callback,
    });
  }

  if (isApiAssistant(assistant)) {
    return runApiAssistant({
      getAssistant,
      callAI,
      callAIImage,
      taskId,
      assistant,
      parameters,
      parentTaskId,
      callback,
    });
  }

  throw new Error('Unimplemented');
}

async function runFunctionAssistant({
  getAssistant,
  callAI,
  callAIImage,
  taskId,
  assistant,
  context,
  parameters,
  parentTaskId,
  callback,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: FunctionAssistant;
  context?: { [key: string]: any };
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}) {
  const results = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        assistant,
        callAI,
        callAIImage,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
        parentTaskId: taskId,
        callback,
      })
    : [];

  if (!assistant.code) throw new Error(`Assistant ${assistant.id}'s code is empty`);

  const vm = new NodeVM({
    console: 'redirect',
    sandbox: {
      context: {
        get: (name: any) => {
          if (isNil(name) || name === '') return undefined;
          let result = context?.[name] || results.find((i) => i[0].variable === name)?.[1];
          while (typeof result === 'function') {
            result = result();
          }
          return result;
        },
      },
      URL,
      call,
      fetch,
      env: {
        languages: env.languages,
        appId: env.appId,
        appUrl: env.appUrl,
      },
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

    callback?.({
      type: AssistantResponseType.LOG,
      taskId,
      assistantId: assistant.id,
      log: logData,
      timestamp: Date.now(),
    });
  });

  const module = await vm.run(assistant.code);
  if (typeof module.default !== 'function')
    throw new Error('Invalid function file: function file must export default function');

  const args = Object.fromEntries(
    await Promise.all(
      (assistant.parameters ?? [])
        .filter((i): i is typeof i & { key: string } => !!i.key)
        .map(async (i) => [i.key, parameters?.[i.key] || (await vm.sandbox.context.get(i.key)) || i.defaultValue])
    )
  );

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    taskId,
    parentTaskId,
    assistantName: assistant.name,
    inputParameters: parameters,
    fnArgs: args,
  });

  const result = await module.default(args);

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { content: typeof result === 'string' ? result : JSON.stringify(result) },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return result;
}

async function runApiAssistant({
  callAI,
  callAIImage,
  getAssistant,
  taskId,
  assistant,
  parameters,
  parentTaskId,
  callback,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: ApiAssistant;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}) {
  if (!assistant.requestUrl) throw new Error(`Assistant ${assistant.id}'s url is empty`);

  const results = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        assistant,
        callAI,
        callAIImage,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
        parentTaskId: taskId,
        callback,
      })
    : [];

  const isSameVariable = (left?: string, right?: string) => left && left === right;

  const args = Object.fromEntries(
    await Promise.all(
      (assistant.parameters ?? [])
        .filter((i): i is typeof i & { key: string } => !!i.key)
        .map(async (i) => [
          i.key,
          parameters?.[i.key] ||
            results.find((r) => isSameVariable(i.key, r[0].variable) || isSameVariable(i.label, r[0].variable))?.[1] ||
            i.defaultValue,
        ])
    )
  );

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    taskId,
    assistantName: assistant.name,
    parentTaskId,
    inputParameters: parameters,
    apiArgs: args,
  });

  const method = assistant.requestMethod || 'GET';
  const isGet = method === 'get';

  let result: any;
  let error: any;

  try {
    const response = await axios({
      url: assistant.requestUrl,
      method,
      params: isGet ? args : undefined,
      data: isGet ? undefined : args,
    });

    result = response.data;
  } catch (e) {
    error = {
      error: {
        message: e.message,
        ...(isAxiosError(e) ? pick(e.response, 'status', 'statusText', 'data') : undefined),
      },
    };
  }

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { content: typeof result === 'string' ? result : JSON.stringify(result || error) },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return result;
}

async function renderMessage(message: string, parameters?: { [key: string]: any }) {
  return Mustache.render(message, parameters, undefined, {
    escape: (v) => (typeof v === 'object' ? JSON.stringify(v) : v),
  });
}

async function runPromptAssistant({
  callAI,
  callAIImage,
  taskId,
  getAssistant,
  assistant,
  parameters,
  parentTaskId,
  callback,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: PromptAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}) {
  if (!assistant.prompts?.length) throw new Error('Require at least one prompt');

  const executeBlocks = assistant.prompts
    .filter((i): i is Extract<Prompt, { type: 'executeBlock' }> => isExecuteBlock(i))
    .map((i) => i.data);

  const blockResults = await runExecuteBlocks({
    assistant,
    callAI,
    callAIImage,
    getAssistant,
    executeBlocks,
    parameters,
    parentTaskId: taskId,
    callback,
  });

  const variables = { ...parameters };

  for (const [block, result] of blockResults) {
    const { variable } = block;
    if (variable) {
      variables[variable] = result;
    }
  }

  const messages = (
    await Promise.all(
      assistant.prompts
        .filter((i) => i.visibility !== 'hidden')
        .map(async (prompt) => {
          if (prompt.type === 'message') {
            return {
              role: prompt.data.role,
              content: await renderMessage(
                // 过滤注释节点
                prompt.data.content
                  ?.split('\n')
                  .filter((i) => !i.startsWith('//'))
                  .join('\n') || '',
                variables
              ),
            };
          }

          if (prompt.type === 'executeBlock') {
            if (prompt?.data?.role === 'none') return null;
            const result = blockResults.find((i) => i[0].id === prompt.data.id)?.[1];

            if (prompt.data.formatResultType === 'asHistory') {
              return flattenDeep([result])
                .filter(
                  (i): i is { role: Role; content: string } =>
                    typeof i?.role === 'string' && typeof i.content === 'string'
                )
                .map((message) => pick(message, 'role', 'content'));
            }

            return {
              role: prompt.data.role ?? 'system',
              content: typeof result === 'string' ? result : JSON.stringify(result),
            };
          }

          console.warn('Unsupported prompt type', prompt);
          return undefined;
        })
    )
  )
    .flat()
    .filter((i): i is Required<NonNullable<typeof i>> => !!i?.content);

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    parentTaskId,
    taskId,
    assistantName: assistant.name,
    inputParameters: parameters,
    promptMessages: messages,
  });

  const res = await callAI({
    assistant,
    outputModel: true,
    input: {
      stream: true,
      messages,
      model: assistant.model,
      temperature: assistant.temperature,
      topP: assistant.topP,
      presencePenalty: assistant.presencePenalty,
      frequencyPenalty: assistant.frequencyPenalty,
    },
  });

  let result = '';

  for await (const chunk of res.chatCompletionChunk) {
    result += chunk.delta.content || '';
    callback?.({
      type: AssistantResponseType.CHUNK,
      taskId,
      assistantId: assistant.id,
      delta: { content: chunk.delta.content },
    });
  }

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    ...(parentTaskId
      ? {
          parentTaskId,
          modelParameters: res.modelInfo,
        }
      : { parentTaskId }),
    taskId,
    assistantName: assistant.name,
    inputParameters: parameters,
    promptMessages: messages,
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return result;
}

async function runImageAssistant({
  callAI,
  callAIImage,
  taskId,
  getAssistant,
  assistant,
  parameters,
  parentTaskId,
  callback,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: ImageAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}) {
  if (!assistant.prompt?.length) throw new Error('Prompt cannot be empty');
  const defaultModel = getSupportedImagesModels().find((i) => i.model === (assistant.model || defaultImageModel));

  const blockResults = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        assistant,
        callAI,
        callAIImage,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
        parentTaskId: taskId,
        callback,
      })
    : [];

  const variables = { ...parameters };

  for (const [block, result] of blockResults) {
    const { variable } = block;
    if (variable) {
      variables[variable] = result;
    }
  }

  const prompt = await renderMessage(
    assistant.prompt
      .split('\n')
      .filter((i) => !i.startsWith('//'))
      .join('\n'),
    variables
  );

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    taskId,
    assistantName: assistant.name,
    inputParameters: parameters,
    ...(parentTaskId
      ? {
          parentTaskId,
          modelParameters: {
            model: assistant.model,
            n: assistant.n || defaultModel?.nDefault,
            quality: assistant.quality || defaultModel?.qualityDefault,
            style: assistant.style || defaultModel?.styleDefault,
            size: assistant.size || defaultModel?.sizeDefault,
          },
        }
      : { parentTaskId }),
  });

  const { data } = await callAIImage({
    assistant,
    input: {
      prompt,
      n: assistant.n,
      model: assistant.model as any,
      quality: assistant.quality as any,
      size: assistant.size as any,
      style: assistant.style as any,
      responseFormat: assistant.responseFormat as any,
    },
  });

  callback?.({ type: AssistantResponseType.CHUNK, taskId, assistantId: assistant.id, delta: { images: data } });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return data;
}

async function runExecuteBlocks({
  assistant,
  callAI,
  callAIImage,
  getAssistant,
  parameters,
  executeBlocks,
  parentTaskId,
  callback,
}: {
  assistant: Assistant;
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  parameters?: { [key: string]: any };
  executeBlocks: ExecuteBlock[];
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}) {
  const variables = {
    ...parameters,
  };

  const tasks: [ExecuteBlock, () => () => Promise<any>][] = [];
  const cache: { [key: string]: Promise<any> } = {};

  for (const executeBlock of executeBlocks) {
    const task = () => async () => {
      cache[executeBlock.id] ??= runExecuteBlock({
        taskId: taskIdGenerator.nextId().toString(),
        assistant,
        callAI,
        callAIImage,
        getAssistant,
        executeBlock,
        parameters: variables,
        parentTaskId,
        callback,
      });

      return cache[executeBlock.id]!;
    };

    if (executeBlock.variable) {
      variables[executeBlock.variable] = task;
    }

    tasks.push([executeBlock, task]);
  }

  return Promise.all(tasks.map((i) => i[1]()().then((result) => [i[0], result] as const)));
}

async function runExecuteBlock({
  taskId,
  assistant,
  callAI,
  callAIImage,
  getAssistant,
  executeBlock,
  parameters,
  parentTaskId,
  callback,
}: {
  taskId: string;
  assistant: Assistant;
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
}) {
  const { tools } = executeBlock;
  if (!tools?.length) return undefined;

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: {
      currentPhase: ExecutionPhase.EXECUTE_BLOCK_START,
      blockId: executeBlock.id,
      blockName: executeBlock.variable,
    },
  });

  if (!executeBlock.selectType || executeBlock.selectType === 'all') {
    const result = (
      await Promise.all(
        tools.map(async (tool) => {
          const toolAssistant = await getAssistant(tool.id);
          if (!toolAssistant) return undefined;

          const args = Object.fromEntries(
            await Promise.all(
              (toolAssistant.parameters ?? [])
                .filter((i): i is typeof i & { key: string } => !!i.key)
                .map(async (i) => {
                  const template = tool.parameters?.[i.key]?.trim();
                  const value = template ? await renderMessage(template, parameters) : parameters?.[i.key];

                  return [i.key, value];
                })
            )
          );

          return runAssistant({
            taskId: taskIdGenerator.nextId().toString(),
            callAI,
            callAIImage,
            getAssistant,
            assistant: toolAssistant,
            parameters: args,
            parentTaskId,
            callback,
          });
        })
      )
    ).filter((i) => !isNil(i));

    callback?.({
      type: AssistantResponseType.CHUNK,
      taskId,
      assistantId: assistant.id,
      delta: { content: JSON.stringify(result) },
    });

    return result;
  }

  if (executeBlock.selectType === 'selectByPrompt') {
    const message = await renderMessage(executeBlock.selectByPrompt || '', parameters);

    const toolAssistants = (
      await Promise.all(
        tools.map(async (tool) => {
          const assistant = await getAssistant(tool.id);
          if (!assistant) return undefined;
          const parameters = (assistant.parameters ?? [])
            .filter((i): i is typeof i & Required<Pick<typeof i, 'key'>> => !!i.key && !tool.parameters?.[i.key])
            .map((parameter) => [parameter.key, { type: 'string', description: parameter.placeholder ?? '' }]);

          return {
            tool,
            assistant,
            function: {
              name: assistant.name?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || assistant.id,
              descriptions: assistant.description,
              parameters: {
                type: 'object',
                properties: Object.fromEntries(parameters),
              },
            },
          };
        })
      )
    ).filter((i): i is NonNullable<typeof i> => !isNil(i));

    callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: assistant.id,
      parentTaskId,
      taskId,
      modelParameters: executeBlock.executeModel,
      assistantName: `${assistant.name}(Select)`,
    });
    const response = await callAI({
      assistant,
      input: {
        ...executeBlock.executeModel,
        messages: [{ role: 'user', content: message }],
        tools: toolAssistants.map((i) => ({
          type: 'function',
          function: {
            name: i.function.name,
            description: i.function.descriptions,
            parameters: i.function.parameters,
          },
        })),
      },
    });

    let calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']> | undefined;

    for await (const chunk of response) {
      if (chunk.delta.content) {
        callback?.({
          type: AssistantResponseType.CHUNK,
          taskId,
          assistantId: assistant.id,
          delta: { content: chunk.delta.content || '' },
        });
      }

      const { toolCalls } = chunk.delta;

      if (toolCalls) {
        if (!calls) {
          calls = toolCalls;
        } else {
          toolCalls.forEach((item, index) => {
            const call = calls?.[index];
            if (call?.function) {
              call.function.name += item.function?.name || '';
              call.function.arguments += item.function?.arguments || '';
            }
          });
        }
      }
    }

    const toolAssistantMap = Object.fromEntries(toolAssistants.map((i) => [i.function.name, i]));

    const result =
      calls &&
      (await Promise.all(
        calls.map(async (call) => {
          if (!call.function?.name || !call.function.arguments) return undefined;

          const tool = toolAssistantMap[call.function.name];
          if (!tool) return undefined;

          const args = JSON.parse(call.function.arguments);
          const toolAssistant = tool?.assistant;
          await Promise.all(
            toolAssistant.parameters?.map(async (item) => {
              const message = tool.tool?.parameters?.[item.key!];
              if (message) {
                args[item.key!] = await renderMessage(message, parameters);
              }
            }) ?? []
          );

          return runAssistant({
            taskId: taskIdGenerator.nextId().toString(),
            callAI,
            callAIImage,
            getAssistant,
            assistant: toolAssistant,
            parameters: args,
            parentTaskId: taskId,
            callback,
          });
        })
      ));

    callback?.({
      type: AssistantResponseType.CHUNK,
      taskId,
      assistantId: assistant.id,
      delta: { content: JSON.stringify(result) },
    });

    return result?.length === 1 ? result[0] : result;
  }

  return undefined;
}

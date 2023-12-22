import { ReadableStream } from 'stream/web';

import { call } from '@blocklet/sdk/lib/component';
import env from '@blocklet/sdk/lib/env';
import axios, { isAxiosError } from 'axios';
import { isNil, pick } from 'lodash';
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
import { ChatCompletionChunk, callAIKitChatCompletions, callAIKitImageGeneration } from '../ai-kit';

export type RunAssistantResponse = RunAssistantChunk | RunAssistantError;

export type RunAssistantChunk = {
  taskId: string;
  assistantId: string;
  delta: {
    content?: string | null;
    images?: {
      b64_string?: string;
      url?: string;
    }[];
  };
};

export type RunAssistantError = {
  error: { message: string };
};

export type RunAssistantCallback = (e: RunAssistantResponse) => void;

export interface GetAssistant {
  (assistantId: string, options: { rejectOnEmpty: true | Error }): Promise<Assistant>;
  (assistantId: string, options?: { rejectOnEmpty?: false }): Promise<Assistant | null>;
}

export type CallAI = (options: {
  assistant: Assistant;
  input: Parameters<typeof callAIKitChatCompletions>[0];
}) => Promise<ReadableStream<ChatCompletionChunk>>;

const taskIdGenerator = new Worker();

export const nextTaskId = () => taskIdGenerator.nextId().toString();

export async function runAssistant({
  taskId,
  callAI,
  getAssistant,
  assistant,
  parameters = {},
  callback,
}: {
  taskId: string;
  callAI: CallAI;
  getAssistant: GetAssistant;
  assistant: Assistant;
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
}): Promise<any> {
  if (isPromptAssistant(assistant)) {
    return runPromptAssistant({
      taskId,
      callAI,
      getAssistant,
      assistant,
      parameters,
      callback,
    });
  }

  if (isImageAssistant(assistant)) {
    return runImageAssistant({
      taskId,
      callAI,
      getAssistant,
      assistant,
      parameters,
      callback,
    });
  }

  if (isFunctionAssistant(assistant)) {
    return runFunctionAssistant({
      getAssistant,
      callAI,
      taskId,
      assistant,
      parameters,
      callback,
    });
  }

  if (isApiAssistant(assistant)) {
    return runApiAssistant({
      getAssistant,
      callAI,
      taskId,
      assistant,
      parameters,
      callback,
    });
  }

  throw new Error('Unimplemented');
}

async function runFunctionAssistant({
  getAssistant,
  callAI,
  taskId,
  assistant,
  context,
  parameters,
  callback,
}: {
  callAI: CallAI;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: FunctionAssistant;
  context?: { [key: string]: any };
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
}) {
  const results = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        assistant,
        callAI,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
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
    callback?.({ taskId, assistantId: assistant.id, delta: { content: `\nDEBUG: ${JSON.stringify(data)}\n` } });
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

  const result = await module.default(args);

  callback?.({
    taskId,
    assistantId: assistant.id,
    delta: { content: typeof result === 'string' ? result : JSON.stringify(result) },
  });

  return result;
}

async function runApiAssistant({
  callAI,
  getAssistant,
  taskId,
  assistant,
  parameters,
  callback,
}: {
  callAI: CallAI;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: ApiAssistant;
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
}) {
  if (!assistant.requestUrl) throw new Error(`Assistant ${assistant.id}'s url is empty`);

  const results = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        assistant,
        callAI,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
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
    taskId,
    assistantId: assistant.id,
    delta: { content: typeof result === 'string' ? result : JSON.stringify(result || error) },
  });

  return result;
}

async function renderMessage(message: string, parameters?: { [key: string]: any }) {
  return Mustache.render(message, parameters, undefined, { escape: (v) => v });
}

async function runPromptAssistant({
  callAI,
  taskId,
  getAssistant,
  assistant,
  parameters,
  callback,
}: {
  callAI: CallAI;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: PromptAssistant;
  parameters: { [key: string]: any };
  callback?: RunAssistantCallback;
}) {
  if (!assistant.prompts?.length) throw new Error('Require at least one prompt');

  const executeBlocks = assistant.prompts
    .filter((i): i is Extract<Prompt, { type: 'executeBlock' }> => isExecuteBlock(i))
    .map((i) => i.data);

  const blockResults = await runExecuteBlocks({
    assistant,
    callAI,
    getAssistant,
    executeBlocks,
    parameters,
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
            const result = blockResults.find((i) => i[0].id === prompt.data.id)?.[1];

            if (isNil(result) || result === '') return undefined;

            if (prompt.data.formatResultType === 'asHistroy') {
              return [result]
                .flat()
                .filter(
                  (i): i is { role: Role; content: string } =>
                    typeof i?.role === 'string' && typeof i.content === 'string'
                )
                .map((message) => pick(message, 'role', 'content'));
            }

            return {
              role: 'system' as const,
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

  const res = await callAI({
    assistant,
    input: {
      stream: true,
      messages,
    },
  });

  let result = '';

  for await (const chunk of res) {
    callback?.({ taskId, assistantId: assistant.id, delta: { content: chunk.delta.content } });
    result += chunk.delta.content || '';
  }

  return result;
}

async function runImageAssistant({
  callAI,
  taskId,
  getAssistant,
  assistant,
  parameters,
  callback,
}: {
  callAI: CallAI;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: ImageAssistant;
  parameters: { [key: string]: any };
  callback?: RunAssistantCallback;
}) {
  if (!assistant.prompt?.length) throw new Error('Prompt cannot be empty');

  const blockResults = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        assistant,
        callAI,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
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

  const { data } = await callAIKitImageGeneration({
    prompt,
    n: assistant.n,
    model: assistant.model as any,
    quality: assistant.quality as any,
    size: assistant.size as any,
    style: assistant.style as any,
    responseFormat: assistant.responseFormat as any,
  });

  callback?.({ taskId, assistantId: assistant.id, delta: { images: data } });

  return data;
}

async function runExecuteBlocks({
  assistant,
  callAI,
  getAssistant,
  parameters,
  executeBlocks,
  callback,
}: {
  assistant: Assistant;
  callAI: CallAI;
  getAssistant: GetAssistant;
  parameters?: { [key: string]: any };
  executeBlocks: ExecuteBlock[];
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
        getAssistant,
        executeBlock,
        parameters: variables,
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
  getAssistant,
  executeBlock,
  parameters,
  callback,
}: {
  taskId: string;
  assistant: Assistant;
  callAI: CallAI;
  getAssistant: GetAssistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
}) {
  const { tools } = executeBlock;
  if (!tools?.length) return undefined;

  if (!executeBlock.selectType || executeBlock.selectType === 'all') {
    const result = (
      await Promise.all(
        tools.map(async (tool) => {
          const assistant = await getAssistant(tool.id);
          if (!assistant) return undefined;

          const args = Object.fromEntries(
            await Promise.all(
              (assistant.parameters ?? [])
                .filter((i): i is typeof i & { key: string } => !!i.key)
                .map(async (i) => {
                  const template = tool.parameters?.[i.key]?.trim();
                  const value = await renderMessage(template?.trim() || `{{${i.key}}}`, parameters);

                  return [i.key, value];
                })
            )
          );

          return runAssistant({
            taskId: taskIdGenerator.nextId().toString(),
            callAI,
            getAssistant,
            assistant,
            parameters: args,
            callback,
          });
        })
      )
    ).filter((i) => !isNil(i));

    callback?.({ taskId, assistantId: assistant.id, delta: { content: JSON.stringify(result) } });

    return result;
  }

  if (executeBlock.selectType === 'selectByPrompt') {
    const message = await renderMessage(executeBlock.selectByPrompt || '', parameters);

    const toolAssistants = (
      await Promise.all(
        tools.map(async (tool) => {
          const assistant = await getAssistant(tool.id);
          if (!assistant) return undefined;

          return {
            tool,
            assistant,
            function: {
              name: assistant.name?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || assistant.id,
              descriptions: assistant.description,
              parameters: {
                type: 'object',
                properties: Object.fromEntries(
                  (assistant.parameters ?? [])
                    .filter((i): i is typeof i & Required<Pick<typeof i, 'key'>> => !!i.key)
                    .map((parameter) => [parameter.key, { type: 'string', description: parameter.placeholder }])
                ),
              },
            },
          };
        })
      )
    ).filter((i): i is NonNullable<typeof i> => !isNil(i));

    const response = await callAI({
      assistant,
      input: {
        messages: [{ role: 'user', content: message }],
        toolChoice: 'auto',
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
        callback?.({ taskId, assistantId: assistant.id, delta: { content: chunk.delta.content } });
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

          const parameters = JSON.parse(call.function.arguments);

          return runAssistant({
            taskId: taskIdGenerator.nextId().toString(),
            callAI,
            getAssistant,
            assistant: tool.assistant,
            parameters,
            callback,
          });
        })
      ));

    callback?.({ taskId, assistantId: assistant.id, delta: { content: JSON.stringify(result) } });

    return result?.length === 1 ? result[0] : result;
  }

  return undefined;
}

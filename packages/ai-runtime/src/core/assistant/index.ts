import { ReadableStream, TextDecoderStream, TransformStream } from 'stream/web';

import { call } from '@blocklet/sdk/lib/component';
import axios, { isAxiosError } from 'axios';
import { createParser } from 'eventsource-parser';
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
import { Mustache } from '../../types/assistant';

export type RunAssistantChunk = { taskId: string; assistantId: string; delta: { content?: string | null } };

export type RunAssistantCallback = (e: RunAssistantChunk) => void;

export interface GetAssistant {
  (assistantId: string, options: { rejectOnEmpty: true | Error }): Promise<Assistant>;
  (assistantId: string, options?: { rejectOnEmpty?: false }): Promise<Assistant | null>;
}

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
  callAI: typeof callAIKit;
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
  callAI: typeof callAIKit;
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

          let result = context?.[name] || results.find((i) => i[0].variable === name);
          while (typeof result === 'function') {
            result = result();
          }
          return result;
        },
      },
      fetch,
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
  callAI: typeof callAIKit;
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
  callAI: typeof callAIKit;
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

            // TODO: 支持选择 block 的结果处理方式：skip/as context/custom
            return {
              role: 'system' as const,
              content: typeof result === 'string' ? result : JSON.stringify(result),
            };
          }

          console.warn('Unsupported prompt type', prompt);
          return undefined;
        })
    )
  ).filter((i): i is Required<NonNullable<typeof i>> => !!i?.content);

  const res = callAI({
    stream: true,
    messages,
  });

  let result = '';

  for await (const chunk of res) {
    callback?.({ taskId, assistantId: assistant.id, delta: { content: chunk.delta.content } });
    result += chunk.delta.content || '';
  }

  return result;
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
  callAI: typeof callAIKit;
  getAssistant: GetAssistant;
  parameters?: { [key: string]: any };
  executeBlocks: ExecuteBlock[];
  callback?: (e: RunAssistantChunk) => any;
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
  callAI: typeof callAIKit;
  getAssistant: GetAssistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  callback?: (e: RunAssistantChunk) => void;
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

    const response = callAI({
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
    });

    let calls: NonNullable<CallAIKitResponseChunk['delta']['toolCalls']> | undefined;

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
            if (call) {
              call.function.name += item.function.name || '';
              call.function.arguments += item.function.arguments || '';
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

interface CallAIKitResponseChunk {
  delta: {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    toolCalls?: {
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }[];
  };
}

export interface CallAIKitInput {
  stream?: boolean;
  model?: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  tools?: {
    type: 'function';
    function: {
      name: string;
      parameters: Record<string, unknown>;
      description?: string;
    };
  }[];
  toolChoice?: 'none' | 'auto';
  messages: (
    | { role: 'system'; content: string }
    | {
        role: 'user';
        content: string;
      }
    | {
        role: 'assistant';
        content: string;
        toolCalls?: {
          id: string;
          type: 'function';
          function: {
            name: string;
            arguments: string;
          };
        }[];
      }
    | {
        content: string | null;
        role: 'tool';
        toolCallId: string;
      }
  )[];
}

export async function* callAIKit(input: CallAIKitInput) {
  const response = await call({
    name: 'ai-kit',
    method: 'POST',
    path: '/api/v1/sdk/completions',
    headers: { Accept: 'text/event-stream' },
    data: input,
    responseType: 'stream',
  });

  const stream = new ReadableStreamFromNodeJs(response.data)
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  for await (const { data } of stream) {
    try {
      if (data) yield JSON.parse(data) as CallAIKitResponseChunk;
    } catch (error) {
      console.error('parse ai response error', error, data);
    }
  }
}

class ReadableStreamFromNodeJs extends ReadableStream<Buffer> {
  constructor(stream: NodeJS.ReadableStream) {
    super({
      start: (controller) => {
        setTimeout(async () => {
          for await (const chunk of stream) {
            controller.enqueue(chunk as Buffer);
          }
          controller.close();
        });
      },
    });
  }
}

class EventSourceParserStream extends TransformStream<any, { data?: string }> {
  constructor() {
    let parser: ReturnType<typeof createParser> | undefined;

    super({
      start(controller) {
        parser = createParser((event) => {
          if (event.type === 'event') {
            controller.enqueue(event);
          }
        });
      },
      transform(chunk) {
        parser?.feed(chunk);
      },
    });
  }
}

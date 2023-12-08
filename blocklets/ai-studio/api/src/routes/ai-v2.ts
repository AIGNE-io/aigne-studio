import { ReadableStream, TextDecoderStream, TransformStream } from 'stream/web';

import { COMMENT_PREFIX } from '@blocklet/prompt-editor/utils';
import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import { sign } from '@blocklet/sdk/lib/util/verify-sign';
import axios, { isAxiosError } from 'axios';
import compression from 'compression';
import { createParser } from 'eventsource-parser';
import { Router } from 'express';
import Joi from 'joi';
import { isNil, pick } from 'lodash';
import fetch from 'node-fetch';
import { Worker } from 'snowflake-uuid';
import { joinURL } from 'ufo';
import { NodeVM } from 'vm2';

import logger from '../libs/logger';
import Mustache from '../libs/mustache';
import { ensureComponentCallOrAuth } from '../libs/security';
import Log, { Status } from '../store/models/logs';
import Projects from '../store/models/projects';
import {
  ApiFile,
  Assistant,
  ExecuteBlock,
  FunctionFile,
  Project,
  Prompt,
  PromptFile,
  defaultBranch,
  getAssistantFromRepository,
  getRepository,
  isApiFile,
  isExecuteBlock,
  isFunctionFile,
  isPromptFile,
} from '../store/projects';

const router = Router();

const callV2InputSchema = Joi.object<{
  projectId: string;
  ref: string;
  working?: boolean;
  assistantId: string;
  parameters?: { [key: string]: any };
}>({
  ref: Joi.string(),
  working: Joi.boolean().default(false),
  projectId: Joi.string(),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
  assistantId: Joi.string(),
});

router.post('/call/v2', compression(), ensureComponentCallOrAuth(), async (req, res) => {
  const stream = req.accepts().includes('text/event-stream');

  const input = await callV2InputSchema.validateAsync(req.body, { stripUnknown: true });

  const project = await Projects.findByPk(input.projectId, {
    rejectOnEmpty: new Error(`Project ${input.projectId} not found`),
  });

  const repository = await getRepository({ projectId: input.projectId });

  const getAssistant = (fileId: string) => {
    return getAssistantFromRepository({
      repository,
      ref: input.ref,
      working: input.working,
      assistantId: fileId,
    });
  };

  const assistant = await getAssistant(input.assistantId);

  const startDate = new Date();
  const log = await Log.create({
    templateId: input.assistantId,
    hash: input.ref || defaultBranch,
    projectId: input.projectId,
    prompts: isPromptFile(assistant) ? assistant.prompts : undefined,
    parameters: input.parameters,
    startDate,
  });

  try {
    const emit = (data: ResponseSSEV2) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
      }

      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.flush();
    };

    const taskId = taskIdGenerator.nextId().toString();

    emit({ taskId, assistantId: assistant.id, delta: {} });

    const result = await runAssistant({
      taskId,
      project,
      getAssistant,
      assistant,
      parameters: input.parameters,
      callback: stream ? emit : undefined,
      log,
    });

    if (!stream) {
      res.json(result);
    }

    res.end();

    const endDate = new Date();
    const requestTime = endDate.getTime() - startDate.getTime();
    await log.update({ endDate, requestTime, status: Status.SUCCESS, response: result });
  } catch (error) {
    const endDate = new Date();
    const requestTime = endDate.getTime() - startDate.getTime();
    await log.update({ endDate, requestTime, status: Status.FAIL, error: error.message });
    throw error;
  }
});

export type ResponseSSEV2 = { taskId: string; assistantId: string; delta: { content?: string | null } };

type RunAssistantCallback = (e: ResponseSSEV2) => void;

interface GetAssistant {
  (assistantId: string, options: { rejectOnEmpty: true | Error }): Promise<Assistant>;
  (assistantId: string, options?: { rejectOnEmpty?: false }): Promise<Assistant | null>;
}

const taskIdGenerator = new Worker();

async function runAssistant({
  taskId,
  project,
  getAssistant,
  assistant,
  parameters = {},
  callback,
  log,
}: {
  taskId: string;
  project: Project;
  getAssistant: GetAssistant;
  assistant: Assistant;
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
  log: Log;
}): Promise<any> {
  if (isPromptFile(assistant)) {
    return runPromptAssistant({
      taskId,
      project,
      getAssistant,
      assistant,
      parameters,
      callback,
      log,
    });
  }

  if (isFunctionFile(assistant)) {
    return runFunctionAssistant({
      project,
      getAssistant,
      taskId,
      assistant,
      parameters,
      callback,
      log,
    });
  }

  if (isApiFile(assistant)) {
    return runApiAssistant({
      project,
      getAssistant,
      taskId,
      assistant,
      parameters,
      callback,
      log,
    });
  }

  throw new Error('Unimplemented');
}

async function runFunctionAssistant({
  project,
  getAssistant,
  taskId,
  assistant,
  context,
  parameters,
  callback,
  log,
}: {
  project: Project;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: FunctionFile;
  context?: { [key: string]: any };
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
  log: Log;
}) {
  const results = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        project,
        assistant,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
        callback,
        log,
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
  project,
  getAssistant,
  taskId,
  assistant,
  parameters,
  callback,
  log,
}: {
  project: Project;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: ApiFile;
  parameters?: { [key: string]: any };
  callback?: RunAssistantCallback;
  log: Log;
}) {
  if (!assistant.requestUrl) throw new Error(`Assistant ${assistant.id}'s url is empty`);

  const results = assistant.prepareExecutes?.length
    ? await runExecuteBlocks({
        project,
        assistant,
        getAssistant,
        parameters,
        executeBlocks: assistant.prepareExecutes,
        callback,
        log,
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
  taskId,
  project,
  getAssistant,
  assistant,
  parameters,
  callback,
  log,
}: {
  taskId: string;
  project: Project;
  getAssistant: GetAssistant;
  assistant: PromptFile;
  parameters: { [key: string]: any };
  callback?: RunAssistantCallback;
  log: Log;
}) {
  if (!assistant.prompts?.length) throw new Error('Require at least one prompt');

  const childStartDate = new Date();

  const executeBlocks = assistant.prompts
    .filter((i): i is Extract<Prompt, { type: 'executeBlock' }> => isExecuteBlock(i))
    .map((i) => i.data);

  const blockResults = await runExecuteBlocks({
    project,
    assistant,
    getAssistant,
    executeBlocks,
    parameters,
    callback,
    log,
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
                  .filter((i) => !i.startsWith(COMMENT_PREFIX))
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

          logger.warn('Unsupported prompt type', prompt);
          return undefined;
        })
    )
  ).filter((i): i is Required<NonNullable<typeof i>> => !!i?.content);

  const childLog = await Log.create({
    templateId: assistant?.id,
    prompts: messages,
    parameters,
    parentId: log.id,
    startDate: childStartDate,
  });

  const input = {
    modelName: assistant.model ?? project?.model,
    temperature: assistant.temperature ?? project?.temperature,
    topP: assistant.topP ?? project?.topP,
    presencePenalty: assistant.presencePenalty ?? project?.presencePenalty,
    frequencyPenalty: assistant.frequencyPenalty ?? project?.frequencyPenalty,
    maxTokens: assistant.maxTokens ?? project?.maxTokens,
    stream: true,
    messages,
  };

  const res = callAIKit(input);

  let result = '';

  for await (const chunk of res) {
    callback?.({ taskId, assistantId: assistant.id, delta: { content: chunk.delta.content } });
    result += chunk.delta.content || '';
  }

  const endDate = new Date();
  const requestTime = endDate.getTime() - childStartDate.getTime();
  await childLog.update({ status: Status.SUCCESS, endDate, requestTime, response: result });

  return result;
}

async function runExecuteBlocks({
  project,
  assistant,
  getAssistant,
  parameters,
  executeBlocks,
  callback,
  log,
}: {
  project: Project;
  assistant: Assistant;
  getAssistant: GetAssistant;
  parameters?: { [key: string]: any };
  executeBlocks: ExecuteBlock[];
  callback?: (e: ResponseSSEV2) => any;
  log: Log;
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
        project,
        assistant,
        getAssistant,
        executeBlock,
        parameters: variables,
        callback,
        log,
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
  project,
  assistant,
  getAssistant,
  executeBlock,
  parameters,
  callback,
  log,
}: {
  taskId: string;
  project: Project;
  assistant: Assistant;
  getAssistant: GetAssistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  callback?: (e: ResponseSSEV2) => void;
  log: Log;
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
            project,
            getAssistant,
            assistant,
            parameters: args,
            callback,
            log,
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

    const response = callAIKit({
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
            project,
            getAssistant,
            assistant: tool.assistant,
            parameters,
            callback,
            log,
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

interface CallAIKitInput {
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

async function* callAIKit(input: CallAIKitInput) {
  const response = await fetch(joinURL(getComponentWebEndpoint('ai-kit'), '/api/v1/sdk/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'x-component-sig': sign(input) },
    body: JSON.stringify(input),
  });

  const stream = new ReadableStreamFromNodeJs(response.body)
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

export default router;

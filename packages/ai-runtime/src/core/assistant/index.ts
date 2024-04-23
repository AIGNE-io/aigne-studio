import { join } from 'path';

import { ChatCompletionChunk } from '@blocklet/ai-kit/api/types';
import { getBuildInDatasets } from '@blocklet/dataset-sdk';
import { getRequest } from '@blocklet/dataset-sdk/request';
import { getAllParameters, getRequiredFields } from '@blocklet/dataset-sdk/request/util';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import { call as callFunc } from '@blocklet/sdk/lib/component';
import { env, logger } from '@blocklet/sdk/lib/config';
import axios, { isAxiosError } from 'axios';
import { flattenDeep, isNil, pick, startCase, toLower } from 'lodash';
import fetch from 'node-fetch';
import { Worker } from 'snowflake-uuid';
import { NodeVM } from 'vm2';

import { TranspileTs } from '../../builtin/complete';
import { languages } from '../../constant/languages';
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
import {
  ImageAssistant,
  Mustache,
  OnTaskCompletion,
  Parameter,
  Role,
  Tool,
  User,
  isImageAssistant,
} from '../../types/assistant';
import { AssistantResponseType, ExecutionPhase } from '../../types/runtime';
import retry from '../utils/retry';
import { outputVariablesToJoiSchema, outputVariablesToJsonSchema } from '../utils/schema';
import { BuiltinModules } from './builtin';
import {
  extractMetadataFromStream,
  generateOutput,
  metadataOutputFormatPrompt,
  metadataStreamOutputFormatPrompt,
} from './generate-output';
import { CallAI, CallAIImage, GetAssistant, RunAssistantCallback, ToolCompletionDirective } from './type';

const getUserHeader = (user: any) => {
  return {
    'x-user-did': user?.did,
    'x-user-role': user?.role,
    'x-user-provider': user?.provider,
    'x-user-fullname': user?.fullName && encodeURIComponent(user?.fullName),
    'x-user-wallet-os': user?.walletOS,
  };
};

const defaultScope = 'session';

const MAX_RETRIES = 3;

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
  user,
  sessionId,
  projectId,
}: {
  taskId: string;
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  assistant: Assistant;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}): Promise<any> {
  // setup global variables for prompt rendering
  parameters.$user = user;

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
  });

  const assistantVariables = await getVariables({
    assistant,
    callAI,
    callAIImage,
    getAssistant,
    parameters,
    parentTaskId: taskId,
    callback,
    user,
    sessionId,
    projectId,
  });

  try {
    if (isPromptAssistant(assistant)) {
      return await runPromptAssistant({
        taskId,
        parentTaskId,
        callAI,
        callAIImage,
        getAssistant,
        assistant,
        parameters: assistantVariables,
        callback,
        user,
        sessionId,
        projectId,
      });
    }

    if (isImageAssistant(assistant)) {
      return await runImageAssistant({
        taskId,
        parentTaskId,
        callAI,
        callAIImage,
        getAssistant,
        assistant,
        parameters: assistantVariables,
        callback,
        user,
        sessionId,
        projectId,
      });
    }

    if (isFunctionAssistant(assistant)) {
      return await runFunctionAssistant({
        getAssistant,
        callAI,
        callAIImage,
        taskId,
        parentTaskId,
        assistant,
        parameters: assistantVariables,
        callback,
        user,
        sessionId,
        projectId,
      });
    }

    if (isApiAssistant(assistant)) {
      return await runApiAssistant({
        getAssistant,
        callAI,
        callAIImage,
        taskId,
        parentTaskId,
        assistant,
        parameters: assistantVariables,
        callback,
        user,
        sessionId,
        projectId,
      });
    }
  } catch (e) {
    if (e instanceof ToolCompletionDirective) {
      if (e.type === OnTaskCompletion.EXIT) {
        callback?.({
          type: AssistantResponseType.EXECUTE,
          taskId,
          parentTaskId,
          assistantId: assistant.id,
          assistantName: assistant.name,
          execution: { currentPhase: ExecutionPhase.EXECUTE_SELECT_STOP },
        });
        return undefined;
      }
    }
    throw e;
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
  user,
  sessionId,
  projectId,
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
  user?: User;
  sessionId?: string;
  projectId?: string;
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
        user,
        sessionId,
        projectId,
      })
    : [];

  if (!assistant.code) throw new Error(`Assistant ${assistant.id}'s code is empty`);
  const code = await TranspileTs(assistant.code);
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
          let result = context?.[name] || results.find((i) => i[0].variable === name)?.[1];
          while (typeof result === 'function') {
            result = result();
          }
          return result;
        },
      },
      URL,
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

  const module = await vm.run(code, join(__dirname, 'assistant.js'));
  if (typeof module.default !== 'function')
    throw new Error('Invalid function file: function file must export default function');

  const args = Object.fromEntries(
    await Promise.all(
      (assistant.parameters ?? [])
        .filter((i): i is typeof i & { key: string } => !!i.key)
        .map(async (i) => [i.key, parameters?.[i.key] || (await vm.sandbox.context.get(i.key)) || i.defaultValue])
    )
  );

  const ctx = Object.freeze({
    user,
    session: { id: sessionId },
  });

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

  const result = await module.default(args, ctx);

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
  user,
  sessionId,
  projectId,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  taskId: string;
  assistant: ApiAssistant;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
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
        user,
        sessionId,
        projectId,
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

function processAssistantParameters(assistant: Assistant) {
  const assistantParameters = assistant.parameters;

  if (!assistantParameters?.length) {
    return { toolParameters: [], datastoreParameters: [] };
  }

  const toolParameters: Parameter[] = [];
  const datastoreParameters: Parameter[] = [];

  assistantParameters.forEach((param) => {
    if (param.key) {
      if (param.source) {
        if (param.source.variableFrom === 'tool' && param.source.tool) {
          toolParameters.push(param);
        } else if (param.source.variableFrom === 'datastore') {
          datastoreParameters.push(param);
        }
      }
    }
  });

  return { toolParameters, datastoreParameters };
}

const runRequestStorage = async ({
  assistant,
  parentTaskId,
  user,
  callback,
  datastoreParameter,
  scopeMap,
}: {
  assistant: PromptAssistant | ApiAssistant | ImageAssistant | FunctionAssistant;
  parentTaskId?: string;
  user?: User;
  callback?: RunAssistantCallback;
  datastoreParameter: Parameter;
  scopeMap: { [key: string]: any };
}) => {
  if (
    datastoreParameter.key &&
    datastoreParameter.source?.variableFrom === 'datastore' &&
    datastoreParameter.source.scope
  ) {
    const currentTaskId = nextTaskId();

    const scopeParams = scopeMap.local;
    const params = {
      ...scopeParams,
      // key: toLower(datastoreParameter.key),
      // itemId: datastoreParameter.source.itemId
      //   ? await renderMessage(datastoreParameter.source.itemId, parameters)
      //   : datastoreParameter.source.itemId,
      scope: datastoreParameter.source.scope?.scope || defaultScope,
      dataType: datastoreParameter.source.scope?.dataType,
      key: toLower(datastoreParameter.source.scope?.key) || toLower(datastoreParameter.key),
    };

    const callbackParams = {
      taskId: currentTaskId,
      parentTaskId,
      assistantId: assistant.id,
      assistantName: startCase(
        toLower(
          `The storage info of ${datastoreParameter.key} key for ${datastoreParameter.source.scope.scope || defaultScope} Scope`
        )
      ),
    };

    callback?.({
      type: AssistantResponseType.EXECUTE,
      ...callbackParams,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
    });

    callback?.({
      type: AssistantResponseType.INPUT,
      ...callbackParams,
      inputParameters: params as any,
    });

    const { data } = await callFunc({
      name: 'ai-studio',
      path: '/api/datastore/variable-by-query',
      method: 'GET',
      headers: getUserHeader(user),
      params,
    });
    const list = (data || []).map((x: any) => x?.data).filter((x: any) => x);
    const result = list?.length > 0 ? list : list[0] ?? datastoreParameter.source.defaultValue;

    callback?.({
      type: AssistantResponseType.CHUNK,
      ...callbackParams,
      delta: { content: result ? JSON.stringify(result) : 'undefined' },
    });

    callback?.({
      type: AssistantResponseType.EXECUTE,
      ...callbackParams,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    return result;
  }

  return null;
};

const runRequestHistory = async ({
  assistant,
  parentTaskId,
  user,
  callback,
  params,
}: {
  assistant: PromptAssistant | ApiAssistant | ImageAssistant | FunctionAssistant;
  parentTaskId?: string;
  user?: User;
  callback?: RunAssistantCallback;
  params: {
    sessionId?: string;
    userId?: string;
    limit: number;
    keyword: string;
  };
}) => {
  const currentTaskId = nextTaskId();

  const callbackParams = {
    taskId: currentTaskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: startCase(toLower('The History DATA')),
  };

  callback?.({
    type: AssistantResponseType.EXECUTE,
    ...callbackParams,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    ...callbackParams,
    inputParameters: params as any,
  });

  const { data: result } = await callFunc({
    name: 'ai-studio',
    path: '/api/messages',
    method: 'GET',
    headers: getUserHeader(user),
    params,
  });

  callback?.({
    type: AssistantResponseType.CHUNK,
    ...callbackParams,
    delta: { content: result ? JSON.stringify(result) : 'undefined' },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    ...callbackParams,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return result;
};

const runRequestToolAssistant = async ({
  callAI,
  callAIImage,
  getAssistant,
  parameters,
  parentTaskId,
  user,
  sessionId,
  callback,
  toolParameter,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  toolParameter: Parameter;
}) => {
  const cb: ((taskId: string) => RunAssistantCallback) | undefined =
    callback &&
    ((taskId) => (args) => {
      if (args.type === AssistantResponseType.CHUNK && args.taskId === taskId) {
        callback({ ...args });
        return;
      }
      callback(args);
    });

  if (toolParameter.key && toolParameter.source?.variableFrom === 'tool' && toolParameter.source.tool) {
    const currentTaskId = taskIdGenerator.nextId().toString();

    const { tool } = toolParameter.source;
    const toolAssistant = await getAssistant(tool.id);
    if (!toolAssistant) return null;

    const args = Object.fromEntries(
      await Promise.all(
        (toolAssistant.parameters ?? [])
          .filter((i): i is typeof i & { key: string } => !!i.key)
          .map(async (i) => {
            const template = String(tool.parameters?.[i.key] || '').trim();
            const value = template ? await renderMessage(template, parameters) : parameters?.[i.key];
            return [i.key, value];
          })
      )
    );

    const result = await runAssistant({
      taskId: currentTaskId,
      callAI,
      callAIImage,
      getAssistant,
      assistant: toolAssistant,
      parameters: args,
      parentTaskId,
      callback: cb?.(currentTaskId),
      user,
      sessionId,
    });

    return result;
  }

  return null;
};

const getVariables = async ({
  callAI,
  callAIImage,
  getAssistant,
  assistant,
  parameters,
  parentTaskId,
  user,
  sessionId,
  callback,
  projectId,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  assistant: PromptAssistant | ApiAssistant | ImageAssistant | FunctionAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}) => {
  const variables: { [key: string]: any } = { ...parameters };

  const { toolParameters, datastoreParameters } = processAssistantParameters(assistant);

  const userId = user?.did;
  const scopeMap = {
    global: {
      userId,
      projectId,
    },
    session: {
      userId,
      projectId,
      sessionId,
    },
    local: {
      userId,
      projectId,
      sessionId,
      assistantId: assistant.id,
    },
  };

  if (toolParameters.length) {
    for (const toolParameter of toolParameters) {
      if (toolParameter.key && toolParameter.source?.variableFrom === 'tool' && toolParameter.source.tool) {
        const { tool } = toolParameter.source;
        const toolAssistant = await getAssistant(tool.id);
        if (!toolAssistant) continue;

        const result = await runRequestToolAssistant({
          callAI,
          callAIImage,
          getAssistant,
          parameters,
          parentTaskId,
          user,
          sessionId,
          callback,
          toolParameter,
        });

        // TODO: @li-yechao 根据配置的输出类型决定是否需要 parse
        try {
          variables[toolParameter.key] = JSON.parse(result);
        } catch (error) {
          variables[toolParameter.key] = result ?? toolParameter.defaultValue;
        }

        // await persistData(toolParameter);
      }
    }
  }

  if (datastoreParameters.length) {
    for (const datastoreParameter of datastoreParameters) {
      if (datastoreParameter.key && datastoreParameter.source?.variableFrom === 'datastore') {
        const result = await runRequestStorage({
          assistant,
          parentTaskId,
          user,
          callback,
          datastoreParameter,
          scopeMap,
        });

        variables[datastoreParameter.key] = result;
      }
    }
  }

  return variables;
};

async function runPromptAssistant({
  callAI,
  callAIImage,
  taskId,
  getAssistant,
  assistant,
  parameters,
  parentTaskId,
  callback,
  user,
  sessionId,
  projectId,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: PromptAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}) {
  const executeBlocks = (assistant.prompts ?? [])
    .filter((i): i is Extract<Prompt, { type: 'executeBlock' }> => isExecuteBlock(i) && i.visibility !== 'hidden')
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
    user,
    sessionId,
    projectId,
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
      (assistant.prompts ?? [])
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

            if (prompt.data.formatResultType === 'asHistory') {
              return flattenDeep([result])
                .filter(
                  (i): i is { role: Role; content: string } =>
                    typeof i?.role === 'string' && typeof i.content === 'string'
                )
                .map((message) => pick(message, 'role', 'content'));
            }

            if (prompt?.data?.role === 'none') return null;

            return {
              role: prompt.data.role ?? 'system',
              content:
                (await renderMessage(prompt.data.prefix ?? '', variables)) +
                (typeof result === 'string' ? result : JSON.stringify(result)) +
                (await renderMessage(prompt.data.suffix ?? '', variables)),
            };
          }

          console.warn('Unsupported prompt type', prompt);
          return undefined;
        })
    )
  )
    .flat()
    .filter((i): i is Required<NonNullable<typeof i>> => !!i?.content);

  if (assistant.history?.enable) {
    const lastSystemIndex = messages.findLastIndex((i) => i.role === 'system');
    const histories = await runRequestHistory({
      assistant,
      parentTaskId: taskId,
      user,
      callback,
      params: {
        sessionId,
        userId: user?.did,
        limit: assistant.history.limit || 50,
        keyword: await renderMessage(assistant.history.keyword || '', variables),
      },
    });

    if (histories.length) {
      messages.splice(lastSystemIndex, 0, {
        role: 'system',
        content: `## Memory
        Here is the chat histories between user and assistant, inside <histories></histories> XML tags.
        <histories>
        ${JSON.stringify(histories)}
        </histories>`,
      });
    }
  }

  const outputJson = assistant.outputFormat === 'json';
  const { outputVariables = [] } = assistant;
  const streamJson = outputVariables.length > 0;

  const schema = outputVariablesToJsonSchema(outputVariables);
  const outputSchema = JSON.stringify(schema);

  const messagesWithSystemPrompt = [...messages];
  const lastSystemIndex = messagesWithSystemPrompt.findLastIndex((i) => i.role === 'system');

  if (outputJson) {
    messagesWithSystemPrompt.splice(lastSystemIndex + 1, 0, {
      role: 'system',
      content: metadataOutputFormatPrompt(outputSchema),
    });
  } else if (streamJson) {
    messagesWithSystemPrompt.splice(lastSystemIndex + 1, 0, {
      role: 'system',
      content: metadataStreamOutputFormatPrompt(outputSchema),
    });
  }

  if (!messagesWithSystemPrompt.length) return undefined;

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
    inputParameters: variables,
    promptMessages: messagesWithSystemPrompt,
  });

  const run = async () => {
    let jsonResult;
    let result = '';
    const metadataStrings: string[] = [];

    const aiResult = await callAI({
      assistant,
      outputModel: true,
      input: {
        stream: true,
        messages: messagesWithSystemPrompt,
        model: assistant.model,
        temperature: assistant.temperature,
        topP: assistant.topP,
        presencePenalty: assistant.presencePenalty,
        frequencyPenalty: assistant.frequencyPenalty,
      },
    });

    const stream = extractMetadataFromStream(aiResult.chatCompletionChunk, outputJson || streamJson);

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        const { text } = chunk;

        result += text;

        if (!outputJson) {
          callback?.({
            type: AssistantResponseType.CHUNK,
            taskId,
            assistantId: assistant.id,
            delta: { content: text },
          });
        }
      } else if (chunk.type === 'match') {
        metadataStrings.push(chunk.text);
      }
    }

    if (outputJson || streamJson) {
      const joiSchema = outputVariablesToJoiSchema(outputVariables);
      const json = {};
      for (const i of metadataStrings) {
        try {
          const obj = JSON.parse(i);
          Object.assign(json, obj);
        } catch {
          // ignore
        }
      }

      // try to parse all text content as a json
      try {
        Object.assign(json, JSON.parse(result));
      } catch {
        // ignore
      }

      try {
        jsonResult = await joiSchema.validateAsync(json);
      } catch (error) {
        if (outputJson) {
          throw new Error('Unexpected response format from AI');
        } else {
          try {
            jsonResult = await generateOutput({
              assistant,
              messages: messages.concat({ role: 'assistant', content: result }),
              callAI,
              maxRetries: MAX_RETRIES,
            });
          } catch (error) {
            throw new Error('Unexpected response format from AI');
          }
        }
      }
    }

    return { jsonResult, result, aiResult };
  };

  const { jsonResult, result, aiResult } = await retry(run, outputJson ? MAX_RETRIES : 0);

  if (jsonResult) {
    callback?.({
      type: AssistantResponseType.CHUNK,
      taskId,
      assistantId: assistant.id,
      delta: { object: jsonResult },
    });
  }

  for (const output of assistant?.outputVariables || []) {
    if (output?.datastore?.key && output?.name && jsonResult && jsonResult[output?.name as any] && outputJson) {
      const params = {
        params: {
          userId: user?.did || '',
          projectId,
          sessionId,
          assistantId: assistant.id,
          reset: output.datastore.reset,
        },
        data: {
          data: jsonResult[output?.name as any],
          key: toLower(output.datastore?.key),
          dataType: output.datastore.dataType,
          scope: output.datastore.scope,
        },
      };
      await callFunc({
        name: 'ai-studio',
        path: '/api/datastore',
        method: 'POST',
        headers: getUserHeader(user),
        ...params,
      });
      logger.info('save parameter tool to datastore success', params);
    }
  }

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    ...(parentTaskId
      ? {
          parentTaskId,
          modelParameters: aiResult.modelInfo,
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

  return jsonResult ?? result;
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
  user,
  sessionId,
  projectId,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: ImageAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}) {
  if (!assistant.prompt?.length) throw new Error('Prompt cannot be empty');

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
        user,
        sessionId,
        projectId,
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
    parentTaskId,
    assistantName: assistant.name,
    inputParameters: variables,
  });

  const {
    imageRes: { data },
    modelInfo,
  } = await callAIImage({
    assistant,
    outputModel: true,
    input: {
      prompt,
      n: assistant.n,
      model: assistant.model as any,
      quality: assistant.quality as any,
      size: assistant.size as any,
      style: assistant.style as any,
    },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    ...(parentTaskId
      ? {
          parentTaskId,
          modelParameters: modelInfo,
        }
      : { parentTaskId }),
    taskId,
    assistantName: assistant.name,
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
  user,
  sessionId,
  projectId,
}: {
  assistant: Assistant;
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  parameters?: { [key: string]: any };
  executeBlocks: ExecuteBlock[];
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}) {
  const variables = { ...parameters };

  const tasks: [ExecuteBlock, () => () => Promise<any>][] = [];
  const cache: { [key: string]: Promise<any> } = {};
  const datasets = await getBuildInDatasets();

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
        datasets,
        parentTaskId,
        callback,
        user,
        sessionId,
        projectId,
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
  datasets,
  parentTaskId,
  callback,
  user,
  sessionId,
  projectId,
}: {
  taskId: string;
  assistant: Assistant;
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  datasets?: DatasetObject[];
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}) {
  const { tools } = executeBlock;
  if (!tools?.length) return undefined;

  const cb: ((taskId: string) => RunAssistantCallback) | undefined =
    callback &&
    ((taskId) => (args) => {
      if (args.type === AssistantResponseType.CHUNK && args.taskId === taskId) {
        callback({ ...args, respondAs: executeBlock.respondAs });
        return;
      }
      callback(args);
    });

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
          const currentTaskId = taskIdGenerator.nextId().toString();

          if (tool?.from === 'dataset') {
            const dataset = (datasets || []).find((x) => x.id === tool.id);
            return (
              dataset &&
              runAPITool({
                tool,
                taskId: currentTaskId,
                assistant,
                executeBlock,
                parameters,
                dataset,
                parentTaskId,
                callback: cb?.(currentTaskId),
                user,
                sessionId,
                projectId,
              })
            );
          }

          if (tool?.from === 'knowledge') {
            return runKnowledgeTool({
              tool,
              taskId: currentTaskId,
              assistant,
              executeBlock,
              parameters,
              parentTaskId,
              callback: cb?.(currentTaskId),
              user,
            });
          }

          const toolAssistant = await getAssistant(tool.id);
          if (!toolAssistant) return undefined;
          const args = Object.fromEntries(
            await Promise.all(
              (toolAssistant.parameters ?? [])
                .filter((i): i is typeof i & { key: string } => !!i.key)
                .map(async (i) => {
                  const template = String(tool.parameters?.[i.key] || '').trim();
                  const value = template ? await renderMessage(template, parameters) : parameters?.[i.key];

                  return [i.key, value];
                })
            )
          );

          return runAssistant({
            taskId: currentTaskId,
            callAI,
            callAIImage,
            getAssistant,
            assistant: toolAssistant,
            parameters: args,
            parentTaskId,
            callback: cb?.(currentTaskId),
            user,
            sessionId,
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
          if (tool?.from === 'dataset') {
            const dataset = (datasets || []).find((x) => x.id === tool.id);
            if (!dataset) return undefined;

            const name = dataset.summary || dataset.description || '';

            const datasetParameters = getAllParameters(dataset)
              .filter((i): i is typeof i => !!i && !tool.parameters?.[i.name])
              .map((i) => [i.name, { type: 'string', name, description: i.description ?? '' }]);

            const required = getRequiredFields(dataset);

            return {
              tool,
              toolAssistant: dataset,
              function: {
                name: name.replace(/[^a-zA-Z0-9_-]/g, '_')?.slice(0, 64) || dataset.path,
                descriptions: dataset.description || name || '',
                parameters: {
                  type: 'object',
                  properties: Object.fromEntries(datasetParameters),
                  required: required?.length ? required : undefined,
                },
              },
            };
          }

          if (tool?.from === 'knowledge') {
            const parameters = [{ name: 'message', description: 'Search the content of the knowledge' }]
              .filter((i): i is typeof i => !!i && !tool.parameters?.[i.name])
              .map((i) => [i.name, { type: 'string', description: i.description ?? '' }]);

            const { data } = await callFunc({
              name: 'ai-studio',
              path: `/api/datasets/${tool.id}`,
              method: 'GET',
              headers: getUserHeader(user),
            });

            const { name, description } = data;
            return {
              tool,
              toolAssistant: data,
              function: {
                name: name.replace(/[^a-zA-Z0-9_-]/g, '_')?.slice(0, 64) || tool.id,
                descriptions: description || name || '',
                parameters: {
                  type: 'object',
                  properties: Object.fromEntries(parameters),
                },
              },
            };
          }

          const toolAssistant = await getAssistant(tool.id);
          if (!toolAssistant) return undefined;
          const toolParameters = (toolAssistant.parameters ?? [])
            .filter((i): i is typeof i & Required<Pick<typeof i, 'key'>> => !!i.key && !tool.parameters?.[i.key])
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
            .filter((i): i is typeof i & { key: string } => !!i.key)
            .filter((x) => x.required)
            .map((x) => x.key);

          return {
            tool,
            toolAssistant,
            function: {
              name:
                (tool.functionName || toolAssistant.name)?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) ||
                toolAssistant.id,
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

    callback?.({
      type: AssistantResponseType.EXECUTE,
      assistantId: assistant.id,
      parentTaskId,
      taskId,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
    });

    callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: assistant.id,
      parentTaskId,
      taskId,
      modelParameters: executeBlock.executeModel,
      assistantName: `${executeBlock.variable ?? assistant.name}-select`,
      promptMessages: [{ role: 'user', content: message }],
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

    callback?.({
      type: AssistantResponseType.EXECUTE,
      assistantId: assistant.id,
      parentTaskId,
      taskId,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    const toolAssistantMap = Object.fromEntries(toolAssistants.map((i) => [i.function.name, i]));

    if (!calls?.length && executeBlock.defaultToolId) {
      const defaultTool = toolAssistants.find((i) => i.tool.id === executeBlock.defaultToolId);
      calls ??= [];
      calls.push({ type: 'function', function: { name: defaultTool?.function.name, arguments: '{}' } });
    }

    const result =
      calls &&
      (await Promise.all(
        calls.map(async (call) => {
          if (!call.function?.name || !call.function.arguments) return undefined;

          const tool = toolAssistantMap[call.function.name];
          if (!tool) return undefined;
          const requestData = JSON.parse(call.function.arguments);
          const currentTaskId = taskIdGenerator.nextId().toString();

          if (tool.tool.from === 'dataset') {
            return runAPITool({
              tool: tool.tool,
              taskId: currentTaskId,
              assistant,
              executeBlock,
              parameters: { ...parameters, ...requestData },
              dataset: tool.toolAssistant,
              parentTaskId,
              callback: cb?.(currentTaskId),
              user,
              sessionId,
            });
          }

          if (tool.tool.from === 'knowledge') {
            return runKnowledgeTool({
              tool: tool.tool,
              taskId: currentTaskId,
              assistant,
              executeBlock,
              parameters: { ...parameters, ...requestData },
              parentTaskId,
              callback: cb?.(currentTaskId),
              user,
            });
          }

          const toolAssistant = tool?.toolAssistant as Assistant;
          await Promise.all(
            toolAssistant.parameters?.map(async (item) => {
              const message = tool.tool?.parameters?.[item.key!];
              if (message) {
                requestData[item.key!] = await renderMessage(message, parameters);
              }
            }) ?? []
          );

          const res = await runAssistant({
            taskId: currentTaskId,
            callAI,
            callAIImage,
            getAssistant,
            assistant: toolAssistant,
            parameters: requestData,
            parentTaskId: taskId,
            callback: cb?.(currentTaskId),
            user,
            sessionId,
          });

          if (tool.tool?.onEnd === OnTaskCompletion.EXIT) {
            throw new ToolCompletionDirective('The task has been stop. The tool will now exit.', OnTaskCompletion.EXIT);
          }

          return res;
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

async function runAPITool({
  tool,
  dataset,
  taskId,
  assistant,
  executeBlock,
  parameters,
  parentTaskId,
  callback,
  user,
  sessionId,
  projectId,
}: {
  tool: Tool;
  dataset: DatasetObject;
  taskId: string;
  assistant: Assistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
}) {
  const requestData = Object.fromEntries(
    await Promise.all(
      getAllParameters(dataset).map(async (item) => {
        const template = String(tool.parameters?.[item.name!] || '').trim();
        return [item.name, template ? await renderMessage(template, parameters) : parameters?.[item.name]];
      }) ?? []
    )
  );

  const params: { [key: string]: string } = {
    userId: user?.did || '',
    sessionId: sessionId || '',
    assistantId: assistant.id || '',
    projectId: projectId || '',
  };

  const callbackParams = {
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: `${executeBlock.variable ?? dataset.summary}`,
  };

  callback?.({
    type: AssistantResponseType.EXECUTE,
    ...callbackParams,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    ...callbackParams,
    inputParameters: requestData,
  });

  const response = await getRequest(dataset, requestData, { user, params });

  callback?.({
    type: AssistantResponseType.CHUNK,
    ...callbackParams,
    delta: { content: JSON.stringify(response.data) },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    ...callbackParams,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return response.data;
}

async function runKnowledgeTool({
  tool,
  taskId,
  assistant,
  executeBlock,
  parameters,
  parentTaskId,
  callback,
  user,
}: {
  tool: Tool;
  taskId: string;
  assistant: Assistant;
  executeBlock: ExecuteBlock;
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
}) {
  const params = Object.fromEntries(
    await Promise.all(
      [{ name: 'message', description: 'Search the content of the knowledge' }].map(async (item) => {
        const template = String(tool.parameters?.[item.name!] || '').trim();
        return [item.name, template ? await renderMessage(template, parameters) : parameters?.[item.name]];
      }) ?? []
    )
  );

  const { data: knowledge } = await callFunc({
    name: 'ai-studio',
    path: `/api/datasets/${tool.id}`,
    method: 'GET',
    headers: getUserHeader(user),
  });

  if (!knowledge) {
    return undefined;
  }

  const callbackParams = {
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: `${executeBlock.variable ?? knowledge.name}`,
  };

  callback?.({
    type: AssistantResponseType.EXECUTE,
    ...callbackParams,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    ...callbackParams,
    inputParameters: params,
  });

  const { data } = await callFunc({
    name: 'ai-studio',
    path: `/api/datasets/${tool.id}/search`,
    method: 'GET',
    params,
    headers: getUserHeader(user),
  });

  callback?.({
    type: AssistantResponseType.CHUNK,
    ...callbackParams,
    delta: { content: JSON.stringify(data?.docs) },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    ...callbackParams,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return JSON.stringify(data?.docs || []);
}

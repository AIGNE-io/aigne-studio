import crypto from 'crypto';
import { join } from 'path';

import { ChatCompletionChunk, ChatCompletionInput } from '@blocklet/ai-kit/api/types';
import { getBuildInDatasets } from '@blocklet/dataset-sdk';
import { getRequest } from '@blocklet/dataset-sdk/request';
import { getAllParameters, getRequiredFields } from '@blocklet/dataset-sdk/request/util';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import { call, call as callFunc } from '@blocklet/sdk/lib/component';
import { logger } from '@blocklet/sdk/lib/config';
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
  Agent,
  ImageAssistant,
  Mustache,
  OnTaskCompletion,
  Parameter,
  Role,
  RouterAssistant,
  Tool,
  User,
  Variable,
  isAgent,
  isImageAssistant,
  isRouterAssistant,
} from '../../types/assistant';
import { AssistantResponseType, ExecutionPhase, RuntimeOutputVariable } from '../../types/runtime';
import { outputVariablesToJsonSchema } from '../../types/runtime/schema';
import retry from '../utils/retry';
import { BuiltinModules } from './builtin';
import {
  extractMetadataFromStream,
  generateOutput,
  metadataOutputFormatPrompt,
  metadataStreamOutputFormatPrompt,
} from './generate-output';
import selectAgentName from './select-agent';
import { CallAI, CallAIImage, GetAssistant, RunAssistantCallback, ToolCompletionDirective } from './type';
import { validateOutputs } from './validate-outputs';

const md5 = (str: string) => crypto.createHash('md5').update(str).digest('hex');

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
  datastoreVariables,
  functionName,
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
  datastoreVariables: Variable[];
  functionName?: string;
}): Promise<any> {
  // setup global variables for prompt rendering
  parameters.$user = user;

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: functionName ?? assistant.name,
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
    datastoreVariables,
  });

  try {
    if (isAgent(assistant)) {
      return await runAgent({
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
        datastoreVariables,
      });
    }

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
        datastoreVariables,
        functionName,
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
        datastoreVariables,
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
        datastoreVariables,
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
        datastoreVariables,
      });
    }

    if (isRouterAssistant(assistant)) {
      return await runRouterAssistant({
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
        datastoreVariables,
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
          assistantName: functionName ?? assistant.name,
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
  taskId,
  assistant,
  context,
  parameters,
  parentTaskId,
  callback,
  user,
  sessionId,
  datastoreVariables,
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
  datastoreVariables: Variable[];
}) {
  if (!assistant.code) throw new Error(`Assistant ${assistant.id}'s code is empty`);
  const code = await TranspileTs(`\
export default async function(args) {
  ${assistant.code}
}
`);

  const args = Object.fromEntries(
    await Promise.all(
      (assistant.parameters ?? [])
        .filter((i): i is typeof i & { key: string } => !!i.key)
        .map(async (i) => [i.key, parameters?.[i.key] || i.defaultValue])
    )
  );

  const ctx: { [key: string]: any } = Object.freeze({
    ...context,
    user,
    session: { id: sessionId },
  });

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
          let result = ctx?.[name];
          while (typeof result === 'function') {
            result = result();
          }
          return result;
        },
      },
      URL,
      call,
      fetch,
      ...args,
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

  const result = await module.default();

  const object = await validateOutputs({ assistant, datastoreVariables, inputs: parameters, outputs: result });

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { object },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return object;
}

async function runApiAssistant({
  taskId,
  assistant,
  parameters,
  parentTaskId,
  callback,
  datastoreVariables,
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
  datastoreVariables: Variable[];
}) {
  if (!assistant.requestUrl) throw new Error(`Assistant ${assistant.id}'s url is empty`);

  const args = Object.fromEntries(
    await Promise.all(
      (assistant.parameters ?? [])
        .filter((i): i is typeof i & { key: string } => !!i.key)
        .map(async (i) => [i.key, parameters?.[i.key] || i.defaultValue])
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
      message: e.message,
      ...(isAxiosError(e) ? pick(e.response, 'status', 'statusText', 'data') : undefined),
    };
    throw error;
  }

  const object = await validateOutputs({ assistant, datastoreVariables, inputs: parameters, outputs: result });

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { object },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return object;
}

const cacheTranslateFunctionNames: { [key: string]: string } = {};

async function runRouterAssistant({
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
  datastoreVariables,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: RouterAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
  datastoreVariables: Variable[];
}) {
  if (!assistant.prompt) {
    throw new Error('Route Assistant Prompt is  required');
  }

  const message = await renderMessage(assistant.prompt, parameters);
  const routes = assistant?.routes || [];

  const toolAssistants = (
    await Promise.all(
      routes.map(async (tool) => {
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
          .filter((i) => !(tool?.parameters || {})[i.key])
          .filter((x) => x.required)
          .map((x) => x.key);

        const name = tool?.functionName || toolAssistant?.description || toolAssistant?.name || '';
        const hashName = md5(name);

        let functionTranslateName = '';
        if (hashName) {
          if (!cacheTranslateFunctionNames[`${assistant.id}-${tool.id}-${hashName}`]) {
            try {
              const result = await call({
                name: 'ai-studio',
                path: '/api/ai/completions',
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

              cacheTranslateFunctionNames[`${assistant.id}-${tool.id}`] = result?.data?.content;
            } catch (error) {
              logger.error(error);
            }
          }

          functionTranslateName = cacheTranslateFunctionNames[`${assistant.id}-${tool.id}-${hashName}`] || '';
        }

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
    assistantName: `${assistant.name}`,
    promptMessages: [{ role: 'user', content: message }],
  });

  const runFunctionCall = async ({
    tools,
    toolChoice,
  }: {
    tools: ChatCompletionInput['tools'];
    toolChoice: ChatCompletionInput['toolChoice'];
  }) => {
    const response = await callAI({
      assistant,
      input: {
        model: assistant?.model,
        temperature: assistant?.temperature,
        topP: assistant?.topP,
        presencePenalty: assistant?.presencePenalty,
        frequencyPenalty: assistant?.frequencyPenalty,
        messages: [{ role: 'user', content: message }],
        tools,
        toolChoice,
      },
    });

    let calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']> | undefined;

    for await (const chunk of response) {
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

    return calls;
  };

  const calls = await runFunctionCall({
    tools: toolAssistants.map((i) => ({
      type: 'function',
      function: {
        name: i.function.name,
        description: i.function.descriptions,
        parameters: i.function.parameters,
      },
    })),
    toolChoice: 'required',
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    assistantId: assistant.id,
    parentTaskId,
    taskId,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  const toolAssistantMap = Object.fromEntries(toolAssistants.map((i) => [i.function.name, i]));
  const defaultTool = toolAssistants.find((i) => i.tool.id === assistant.defaultToolId);

  const matchAgentName = async () => {
    // requestCalls 没有找到，检查 jsonResult 是否存在
    let selectedAgent: { category_name?: string } = {};
    try {
      const categories = toolAssistants
        .map((x) => x.function.name)
        .filter((x) => x)
        .map((x) => JSON.stringify({ category_name: x }))
        .join(',');

      selectedAgent = await selectAgentName({
        assistant,
        message,
        categories,
        callAI,
        maxRetries: MAX_RETRIES,
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
      value: assistant?.defaultToolId,
    });
    // 使用默认 Agent
    if (assistant?.defaultToolId) {
      const found = toolAssistantMap[assistant.defaultToolId];
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
  const requestCalls = await matchRequestCalls();

  const result =
    requestCalls &&
    (await Promise.all(
      requestCalls.map(async (call) => {
        if (!call.function?.name || !call.function.arguments) return undefined;

        const tool = toolAssistantMap[call.function.name];
        if (!tool) return undefined;
        const requestData = JSON.parse(call.function.arguments);
        const currentTaskId = taskIdGenerator.nextId().toString();

        const toolAssistant = tool?.toolAssistant as Assistant;
        await Promise.all(
          toolAssistant.parameters?.map(async (item) => {
            const message = tool.tool?.parameters?.[item.key!];
            if (message) {
              requestData[item.key!] = await renderMessage(message, parameters);
            }
          }) ?? []
        );

        const cb: (() => RunAssistantCallback) | undefined =
          callback &&
          (() => (args) => {
            if (args.type === AssistantResponseType.CHUNK && args.taskId === currentTaskId) {
              callback({ ...args });

              // called agent 有 text stream && 当前输出也有 text stream, 直接回显 text stream
              if (
                Object.values(toolAssistant?.outputVariables || {}).find(
                  (x) => x.name === RuntimeOutputVariable.text
                ) &&
                Object.values(assistant?.outputVariables || {}).find((x) => x.name === RuntimeOutputVariable.text) &&
                args?.delta?.content
              ) {
                callback({ ...args, taskId });
              }
              return;
            }

            callback(args);
          });

        const res = await runAssistant({
          taskId: currentTaskId,
          callAI,
          callAIImage,
          getAssistant,
          assistant: toolAssistant,
          parameters: requestData,
          parentTaskId: taskId,
          callback: cb?.(),
          user,
          sessionId,
          projectId,
          datastoreVariables,
        });

        if (tool.tool?.onEnd === OnTaskCompletion.EXIT) {
          throw new ToolCompletionDirective('The task has been stop. The tool will now exit.', OnTaskCompletion.EXIT);
        }

        return res;
      })
    ));

  const obj = result?.length === 1 ? result[0] : result;
  const jsonResult = await validateOutputs({ assistant, datastoreVariables, inputs: parameters, outputs: obj });

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { object: jsonResult },
  });

  return jsonResult;
}

async function renderMessage(message: string, parameters?: { [key: string]: any }) {
  return Mustache.render(message, parameters, undefined, {
    escape: (v) => (typeof v === 'object' ? JSON.stringify(v) : v),
  });
}

const runRequestStorage = async ({
  assistant,
  parentTaskId,
  user,
  callback,
  datastoreParameter,
  ids,
  datastoreVariables,
}: {
  assistant: Assistant;
  parentTaskId?: string;
  user?: User;
  callback?: RunAssistantCallback;
  datastoreParameter: Parameter;
  ids: { [key: string]: string | undefined };
  datastoreVariables: Variable[];
}) => {
  if (
    datastoreParameter.type === 'source' &&
    datastoreParameter.key &&
    datastoreParameter.source?.variableFrom === 'datastore' &&
    datastoreParameter.source.variable
  ) {
    const currentTaskId = nextTaskId();

    const params = {
      ...ids,
      scope: datastoreParameter.source.variable?.scope || defaultScope,
      key: toLower(datastoreParameter.source.variable?.key) || toLower(datastoreParameter.key),
    };

    const callbackParams = {
      taskId: currentTaskId,
      parentTaskId,
      assistantId: assistant.id,
      assistantName: startCase(
        toLower(`From ${datastoreParameter.source.variable.scope || defaultScope} ${datastoreParameter.key} Storage `)
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
    const storageVariable = datastoreVariables.find(
      (x) => toLower(x.key || '') === toLower(params.key || '') && x.scope === params.scope
    );
    let result = (list?.length > 0 ? list : [storageVariable?.defaultValue]).filter((x: any) => x);
    if (storageVariable?.reset) {
      result = (result?.length > 1 ? result : result[0]) ?? '';
    }

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
  assistant: Assistant;
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
  cb,
  toolParameter,
  projectId,
  datastoreVariables,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  cb?: any;
  user?: User;
  sessionId?: string;
  toolParameter: Parameter;
  projectId?: string;
  datastoreVariables: Variable[];
}) => {
  if (
    toolParameter.type === 'source' &&
    toolParameter.key &&
    toolParameter.source?.variableFrom === 'tool' &&
    toolParameter.source.agent
  ) {
    const currentTaskId = taskIdGenerator.nextId().toString();

    const { agent: tool } = toolParameter.source;
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
      projectId,
      datastoreVariables,
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
  datastoreVariables,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  getAssistant: GetAssistant;
  assistant: Assistant;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
  datastoreVariables: Variable[];
}) => {
  const variables: { [key: string]: any } = { ...parameters };

  const userId = user?.did;
  const datasets = await getBuildInDatasets();

  const cb: ((taskId: string) => RunAssistantCallback) | undefined =
    callback &&
    ((taskId) => (args) => {
      if (args.type === AssistantResponseType.CHUNK && args.taskId === taskId) {
        callback({ ...args });
        return;
      }
      callback(args);
    });

  for (const parameter of assistant.parameters || []) {
    if (parameter.key && parameter.type === 'source') {
      if (parameter.source?.variableFrom === 'tool' && parameter.source.agent) {
        const { agent: tool } = parameter.source;
        const toolAssistant = await getAssistant(tool.id);
        if (!toolAssistant) continue;

        // eslint-disable-next-line no-await-in-loop
        const result = await runRequestToolAssistant({
          callAI,
          callAIImage,
          getAssistant,
          parameters,
          parentTaskId,
          user,
          sessionId,
          cb,
          toolParameter: parameter,
          projectId,
          datastoreVariables,
        });

        // TODO: @li-yechao 根据配置的输出类型决定是否需要 parse
        try {
          variables[parameter.key] = JSON.parse(result);
        } catch (error) {
          variables[parameter.key] = result ?? parameter.defaultValue;
        }
      } else if (parameter.source?.variableFrom === 'datastore') {
        // eslint-disable-next-line no-await-in-loop
        const result = await runRequestStorage({
          assistant,
          parentTaskId,
          user,
          callback,
          datastoreParameter: parameter,
          ids: {
            userId,
            projectId,
            sessionId,
            assistantId: assistant.id,
          },
          datastoreVariables,
        });

        variables[parameter.key] = result;
      } else if (parameter.source?.variableFrom === 'knowledge' && parameter.source.knowledge) {
        const currentTaskId = taskIdGenerator.nextId().toString();
        // eslint-disable-next-line no-await-in-loop
        const result = await runKnowledgeTool({
          tool: parameter.source.knowledge,
          taskId: currentTaskId,
          assistant,
          parameters,
          parentTaskId,
          callback: cb?.(currentTaskId),
          user,
        });

        variables[parameter.key] = result ?? parameter.defaultValue;
      } else if (parameter.source?.variableFrom === 'history' && parameter.source.chatHistory) {
        const currentTaskId = taskIdGenerator.nextId().toString();
        // eslint-disable-next-line no-await-in-loop
        const memories = await runRequestHistory({
          assistant,
          parentTaskId: currentTaskId,
          user,
          callback,
          params: {
            sessionId,
            userId: user?.did,
            limit: parameter.source.chatHistory.limit || 50,
            keyword: await renderMessage(parameter.source.chatHistory.keyword || '', variables),
          },
        });

        variables[parameter.key] = memories;
      } else if (parameter.source?.variableFrom === 'api' && parameter.source.api) {
        const { api } = parameter.source;
        const dataset = datasets.find((x) => x.id === api.id);
        const currentTaskId = taskIdGenerator.nextId().toString();

        // eslint-disable-next-line no-await-in-loop
        const result = await runAPITool({
          tool: api,
          taskId: currentTaskId,
          assistant,
          parameters,
          dataset: (dataset || {}) as DatasetObject,
          parentTaskId,
          callback: cb?.(currentTaskId),
          user,
          sessionId,
        });

        variables[parameter.key] = result;
      }
    }
  }

  return variables;
};

async function runAgent({
  taskId,
  assistant,
  parameters,
  parentTaskId,
  callback,
  datastoreVariables,
}: {
  callAI: CallAI;
  callAIImage: CallAIImage;
  taskId: string;
  getAssistant: GetAssistant;
  assistant: Agent;
  parameters: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId?: string;
  datastoreVariables: Variable[];
}) {
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
  });

  const result = await validateOutputs({ assistant, datastoreVariables, inputs: parameters, outputs: {} });

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { object: result },
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
  datastoreVariables,
  functionName,
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
  datastoreVariables: Variable[];
  functionName?: string;
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
    datastoreVariables,
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

  const { outputVariables = [] } = assistant;
  const onlyOutputJson = !outputVariables.some((i) => (i.name as RuntimeOutputVariable) === RuntimeOutputVariable.text);
  const outputStreamAndJson = outputVariables.some(
    (i) => i.name && (i.name as RuntimeOutputVariable) !== RuntimeOutputVariable.text
  );

  const schema = outputVariablesToJsonSchema(assistant, datastoreVariables);
  const outputSchema = JSON.stringify(schema);

  const messagesWithSystemPrompt = [...messages];
  const lastSystemIndex = messagesWithSystemPrompt.findLastIndex((i) => i.role === 'system');

  if (onlyOutputJson) {
    messagesWithSystemPrompt.splice(lastSystemIndex + 1, 0, {
      role: 'system',
      content: metadataOutputFormatPrompt(outputSchema),
    });
  } else if (outputStreamAndJson) {
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
    assistantName: functionName ?? assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
  });

  callback?.({
    type: AssistantResponseType.INPUT,
    assistantId: assistant.id,
    parentTaskId,
    taskId,
    assistantName: functionName ?? assistant.name,
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

    const stream = extractMetadataFromStream(aiResult.chatCompletionChunk, onlyOutputJson || outputStreamAndJson);

    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        const { text } = chunk;

        result += text;

        if (!onlyOutputJson) {
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

    if (onlyOutputJson || outputStreamAndJson) {
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
        jsonResult = await validateOutputs({ assistant, datastoreVariables, inputs: parameters, outputs: json });
      } catch (error) {
        if (onlyOutputJson) {
          throw new Error('Unexpected response format from AI');
        } else {
          try {
            jsonResult = await generateOutput({
              assistant,
              messages: messages.concat({ role: 'assistant', content: result }),
              callAI,
              maxRetries: MAX_RETRIES,
              datastoreVariables,
            });
          } catch (error) {
            throw new Error('Unexpected response format from AI');
          }
        }
      }
    }

    return { jsonResult, result, aiResult };
  };

  const { jsonResult, result, aiResult } = await retry(run, onlyOutputJson ? MAX_RETRIES : 0);

  if (jsonResult) {
    callback?.({
      type: AssistantResponseType.CHUNK,
      taskId,
      assistantId: assistant.id,
      delta: { object: jsonResult },
    });
  }

  for (const output of assistant?.outputVariables || []) {
    if (output?.variable?.key && output?.name && jsonResult && jsonResult[output?.name as any]) {
      const datastoreVariable = datastoreVariables.find(
        (x) => toLower(x.key || '') === toLower(output.variable?.key || '') && x.scope === output.variable?.scope
      );

      const params = {
        params: {
          userId: user?.did || '',
          projectId,
          sessionId,
          assistantId: assistant.id,
          reset: datastoreVariable?.reset,
        },
        data: {
          data: jsonResult[output?.name as any],
          key: toLower(output.variable?.key),
          scope: output.variable.scope,
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
    assistantName: functionName ?? assistant.name,
    inputParameters: parameters,
    promptMessages: messagesWithSystemPrompt,
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: functionName ?? assistant.name,
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
  datastoreVariables,
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
  datastoreVariables: Variable[];
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
        datastoreVariables,
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

  const object = await validateOutputs({
    assistant,
    datastoreVariables,
    inputs: parameters,
    outputs: { $images: data },
  });

  callback?.({
    type: AssistantResponseType.CHUNK,
    taskId,
    assistantId: assistant.id,
    delta: { images: data, object },
  });

  callback?.({
    type: AssistantResponseType.EXECUTE,
    taskId,
    parentTaskId,
    assistantId: assistant.id,
    assistantName: assistant.name,
    execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
  });

  return object;
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
  datastoreVariables,
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
  datastoreVariables: Variable[];
}) {
  if (!executeBlocks.length) return [];

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
        datastoreVariables,
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
  datastoreVariables,
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
  datastoreVariables: Variable[];
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
            projectId,
            datastoreVariables,
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

          const name = tool?.functionName || toolAssistant?.name || '';
          return {
            tool,
            toolAssistant,
            function: {
              name: name?.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || toolAssistant.id,
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
            projectId,
            datastoreVariables,
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
  executeBlock?: ExecuteBlock;
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
        if (typeof tool.parameters?.[item.name!] === 'string') {
          const template = String(tool.parameters?.[item.name!] || '').trim();
          return [item.name, template ? await renderMessage(template, parameters) : parameters?.[item.name]];
        }

        return [item.name, parameters?.[item.name]];
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
    assistantName: `${executeBlock?.variable ?? dataset?.summary}`,
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
  executeBlock?: ExecuteBlock;
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
  params.searchAll = (tool?.parameters || {}).searchAll;

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
    assistantName: startCase(toLower(`From ${executeBlock?.variable ?? knowledge.name} Knowledge`)),
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

// TODO: refactor all blocklet api related code to unified api agent

import { getRequest } from '@blocklet/dataset-sdk/request';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { call } from '@blocklet/sdk';
import { startCase, toLower } from 'lodash';

import { Assistant, AssistantResponseType, ExecutionPhase, Parameter, Tool, User, Variable } from '../../types';
import { RunAssistantCallback } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';

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

export async function runAPITool({
  tool,
  dataset,
  taskId,
  assistant,
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
  parameters?: { [key: string]: any };
  parentTaskId?: string;
  callback?: RunAssistantCallback;
  user?: User;
  sessionId?: string;
  projectId: string;
}) {
  const requestData = Object.fromEntries(
    await Promise.all(
      getAllParameters(dataset).map(async (item) => {
        if (typeof tool.parameters?.[item.name!] === 'string') {
          const template = String(tool.parameters?.[item.name!] || '').trim();
          return [item.name, template ? await renderMessage(template, parameters) : parameters?.[item.name]];
        }

        // 先从传入参数查找，什么都没有填写时，需要读取 tool.parameters?.[item.name!]
        return [item.name, parameters?.[item.name!] || tool.parameters?.[item.name!]];
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
    assistantName: dataset?.summary,
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

export const runRequestStorage = async ({
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
      inputParameters: params,
    });

    const { data } = await call({
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

export const runRequestHistory = async ({
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
    inputParameters: params,
  });

  const { data: result } = await call({
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

export async function runKnowledgeTool({
  tool,
  taskId,
  assistant,
  parameters,
  parentTaskId,
  callback,
  user,
}: {
  tool: Tool;
  taskId: string;
  assistant: Assistant;
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

  const { data: knowledge } = await call({
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
    assistantName: startCase(toLower(`From ${knowledge.name} Knowledge`)),
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

  const { data } = await call({
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

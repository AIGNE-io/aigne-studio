import { getRequest } from '@blocklet/dataset-sdk/request';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import config from '@blocklet/sdk/lib/config';
import axios from 'axios';
import { joinURL } from 'ufo';

import { AssistantResponseType, BlockletAgent, ExecutionPhase } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class BlockletAgentExecutor extends AgentExecutorBase {
  override async process(
    agent: BlockletAgent & GetAgentResult,
    { taskId, parentTaskId, inputs, parameters }: AgentExecutorOptions
  ) {
    const result = await axios.get(joinURL(config.env.appUrl, '/.well-known/service/openapi.json'));

    if (result.status !== 200) {
      throw new Error('Failed to get agent result');
    }

    const list = flattenApiStructure(result.data);
    const blockletAgent = list.find((x) => x.id === agent.id);
    if (!blockletAgent) {
      throw new Error('Failed to find agent result');
    }

    const requestData = Object.fromEntries(
      await Promise.all(
        getAllParameters(blockletAgent).map(async (item) => {
          if (typeof parameters?.[item.name!] === 'string') {
            const template = String(parameters?.[item.name!] || '').trim();
            return [item.name, template ? await renderMessage(template, inputs) : inputs?.[item.name]];
          }

          // 先从传入参数查找，什么都没有填写时，需要读取 parameters?.[item.name!]
          return [item.name, inputs?.[item.name!] || parameters?.[item.name!]];
        }) ?? []
      )
    );

    const params: { [key: string]: string } = {
      userId: this.context.user?.did || '',
      projectId: this.context.entryProjectId,
      sessionId: this.context.sessionId,
      assistantId: agent.id || '',
    };

    const callbackParams = {
      taskId,
      parentTaskId,
      assistantId: agent.id,
      assistantName: blockletAgent?.name,
    };

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      ...callbackParams,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
    });

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      ...callbackParams,
      inputParameters: requestData,
    });

    const response = await getRequest(blockletAgent, requestData, { user: this.context.user, params });

    this.context.callback?.({
      type: AssistantResponseType.CHUNK,
      ...callbackParams,
      delta: { content: JSON.stringify(response.data) },
    });

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      ...callbackParams,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    return response.data;
  }
}

import { getRequest } from '@blocklet/dataset-sdk/request';

import { AssistantResponseType, BlockletAgent, ExecutionPhase } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class BlockletAgentExecutor extends AgentExecutorBase {
  override async process(
    agent: BlockletAgent & GetAgentResult,
    { taskId, parentTaskId, inputs, parameters }: AgentExecutorOptions
  ) {
    const blocklet = await this.getBlockletAgent(agent.id, agent);
    if (!blocklet.api) {
      throw new Error('Blocklet agent api not found.');
    }

    if (!blocklet.agent) {
      throw new Error('Blocklet agent api not found.');
    }

    const inputParameters = Object.fromEntries(
      await Promise.all(
        (blocklet.agent.parameters || []).map(async (item) => {
          if (typeof parameters?.[item.key!] === 'string') {
            const template = String(parameters?.[item.key!] || '').trim();
            return [item.key, template ? await renderMessage(template, inputs) : inputs?.[item.key!]];
          }

          return [item.key, inputs?.[item.key!] || parameters?.[item.key!]];
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
      assistantName: blocklet.agent.name,
    };

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      ...callbackParams,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START },
    });

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      ...callbackParams,
      inputParameters,
    });

    const response = await getRequest(blocklet.api, inputParameters, { user: this.context.user, params });

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

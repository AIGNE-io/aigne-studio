import { callBlockletApi } from '@blocklet/dataset-sdk/request';

import { BlockletAgent } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class BlockletAgentExecutor extends AgentExecutorBase {
  override async process(agent: BlockletAgent & GetAgentResult, { inputs, parameters }: AgentExecutorOptions) {
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

    const response = await callBlockletApi(blocklet.api, inputParameters, { user: this.context.user, params });

    return response.data;
  }
}

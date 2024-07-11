import { callBlockletApi } from '@blocklet/dataset-sdk/request';

import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class BlockletAgentExecutor extends AgentExecutorBase {
  async mergeInputsParameters(
    agent: GetAgentResult,
    { inputs, parameters }: { inputs: { [key: string]: any }; parameters: { [key: string]: any } }
  ) {
    const blocklet = await this.context.getBlockletAgent(agent.id);
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

    return inputParameters;
  }

  override async process(agent: GetAgentResult, { inputs }: AgentExecutorOptions) {
    const blocklet = await this.context.getBlockletAgent(agent.id);
    if (!blocklet.api) {
      throw new Error('Blocklet agent api not found.');
    }

    if (!blocklet.agent) {
      throw new Error('Blocklet agent api not found.');
    }

    const params: { [key: string]: string } = {
      userId: this.context.user?.did || '',
      projectId: this.context.entryProjectId,
      sessionId: this.context.sessionId,
      assistantId: agent.id || '',
    };

    const response = await callBlockletApi(blocklet.api, inputs || {}, { user: this.context.user, params });

    return response.data;
  }
}

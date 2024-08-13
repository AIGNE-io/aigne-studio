import { callBlockletApi } from '@blocklet/dataset-sdk/request';

import { GetAgentResult } from '../assistant/type';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class BlockletAgentExecutor extends AgentExecutorBase {
  override async process(agent: GetAgentResult, { inputs }: AgentExecutorOptions) {
    const blocklet = await this.context.getBlockletAgent(agent.id);

    if (!blocklet.agent) {
      throw new Error('Blocklet agent api not found.');
    }

    if (!blocklet.agent.openApi) {
      throw new Error('Blocklet agent api not found.');
    }

    const params: { [key: string]: string } = {
      userId: this.context.user.did,
      projectId: this.context.entryProjectId,
      sessionId: this.context.sessionId,
      assistantId: agent.id,
    };

    const response = await callBlockletApi(blocklet.agent.openApi, inputs || {}, { user: this.context.user, params });

    return response.data;
  }
}

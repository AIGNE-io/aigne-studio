import { logger } from '@blocklet/sdk/lib/config';
import { cloneDeep } from 'lodash';

import { ParallelCallAssistant } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class ParallelCallAgentExecutor extends AgentExecutorBase {
  override async process() {
    // ignore
  }

  override async execute(agent: ParallelCallAssistant & GetAgentResult, options: AgentExecutorOptions) {
    if (!agent.agents || agent.agents.length === 0) {
      throw new Error('Must choose an agent to execute');
    }

    // 获取被调用的 agent
    const fn = async (agentId: string) => {
      const callAgent = cloneDeep(
        await this.context.getAgent({
          blockletDid: agent.identity.blockletDid,
          projectId: agent.identity.projectId,
          projectRef: agent.identity.projectRef,
          working: agent.identity.working,
          agentId,
          rejectOnEmpty: true,
        })
      );

      const result = await this.context.executor(this.context).execute(callAgent, { ...options });

      return result;
    };

    const list = await Promise.all(agent.agents.map((item) => fn(item.id)));
    logger.info('ParallelCallAgentExecutor', 'execute', 'list', list);

    return list;
  }
}

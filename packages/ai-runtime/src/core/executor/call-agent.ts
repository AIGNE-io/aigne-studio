import { logger } from '@blocklet/sdk/lib/config';
import { cloneDeep } from 'lodash';

import { CallAssistant } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class CallAgentExecutor extends AgentExecutorBase {
  override async process() {
    // ignore
  }

  async getCallAgentAndOptions(agent: CallAssistant & GetAgentResult, options: AgentExecutorOptions) {
    if (!agent.call) {
      throw new Error('Must choose an agent to execute');
    }

    // 获取被调用的 agent
    const callAgent = cloneDeep(
      await this.context.getAgent({
        blockletDid: agent.call.blockletDid || agent.identity.blockletDid,
        projectId: agent.call.projectId || agent.identity.projectId,
        projectRef: agent.identity.projectRef,
        working: agent.identity.working,
        agentId: agent.call.id,
        rejectOnEmpty: true,
      })
    );

    logger.info('call agent output', JSON.stringify(callAgent.outputVariables, null, 2));

    // 处理引用的输出变量
    const map = new Map();
    (agent?.outputVariables || [])
      .map((i) => {
        if (i.from?.type === 'output') {
          const list = callAgent.outputVariables || [];
          const output = list.find((r) => r.id === i?.from?.id);
          if (output) return output;
        }

        return i;
      })
      .forEach((item) => {
        // 出现相同字段时，会被覆盖，保留最后一个
        if (map.has(item.name)) {
          map.delete(item.name);
        }

        map.set(item.name, item);
      });

    const result = Array.from(map.values());
    callAgent.outputVariables = cloneDeep(result);

    logger.info('current agent output', JSON.stringify(agent.outputVariables, null, 2));
    logger.info('merge call agent output', JSON.stringify(callAgent.outputVariables, null, 2));

    // 获取被调用 agent 的输入
    const inputs = await this.prepareInputs(agent, options);
    const parameters = Object.fromEntries(
      await Promise.all(
        Object.entries(agent.call.parameters || {}).map(async ([key, value]) => {
          return [key, value ? await renderMessage(value, inputs) : inputs?.[key] || ''];
        })
      )
    );

    return {
      agent: callAgent,
      options: {
        ...options,
        inputs: {
          ...(inputs || {}),
          ...(parameters || {}),
        },
      },
    };
  }
}

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

    const map = new Map((callAgent?.outputVariables || []).map((item) => [item.name, item]));
    (agent.outputVariables || []).forEach((item) => map.set(item.name, item));
    const result = Array.from(map.values());

    // 覆盖被调用 agent 的输出
    callAgent.outputVariables = cloneDeep(result);

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

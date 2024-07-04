import { logger } from '@blocklet/sdk/lib/config';

import { AssistantResponseType, CallAssistant, OutputVariable, RuntimeOutputVariable, Tool } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';

export class CallAgentExecutor extends AgentExecutorBase {
  private async getCalledAgents(agent: CallAssistant & GetAgentResult) {
    if (!agent.agents || agent.agents.length === 0) {
      throw new Error('Must choose an agent to execute');
    }

    return await Promise.all(
      agent.agents.map(async (item) => ({
        item,
        agent: await this.context.getAgent({
          blockletDid: agent.identity.blockletDid,
          projectId: agent.identity.projectId,
          projectRef: agent.identity.projectRef,
          working: agent.identity.working,
          agentId: item.id,
          rejectOnEmpty: true,
        }),
      }))
    );
  }

  private getLastTextSteamAgentIdMap(calledAgents: { item: Tool; agent: GetAgentResult }[]) {
    const map: { [key: string]: string } = {};
    calledAgents.forEach((item) => {
      const foundText = item.agent.outputVariables?.find((i) => i.name === RuntimeOutputVariable.text);
      if (foundText) map[RuntimeOutputVariable.text] = item.item.id;
    });

    return map[RuntimeOutputVariable.text];
  }

  private getOutputVariables(
    agent: CallAssistant & GetAgentResult,
    calledAgents: { item: Tool; agent: GetAgentResult }[]
  ) {
    const agentOutputVariables: OutputVariable[] = calledAgents.flatMap((item) => item.agent.outputVariables || []);

    const outputVariables = (agent?.outputVariables || []).map((i) => {
      if (i.from?.type === 'output') {
        const output = agentOutputVariables.find((r) => r.id === i?.from?.id);
        if (output) return output;
      }

      return i;
    });

    return outputVariables;
  }

  override async process(agent: CallAssistant & GetAgentResult, options: AgentExecutorOptions) {
    if (!agent.agents || agent.agents.length === 0) {
      throw new Error('Must choose an agent to execute');
    }

    const calledAgents = await this.getCalledAgents(agent);

    // 获取最后输出的文本流
    const lastAgnetIdWithTextSteam = this.getLastTextSteamAgentIdMap(calledAgents);

    const outputVariables = this.getOutputVariables(agent, calledAgents);
    const hasTextStream = outputVariables?.some((i) => i.name === RuntimeOutputVariable.text);

    // 获取被调用的 agent
    const fn = async (callAgent: { item: Tool; agent: GetAgentResult }) => {
      const parameters = Object.fromEntries(
        await Promise.all(
          Object.entries(callAgent.item.parameters || {}).map(async ([key, value]) => {
            return [key, value ? await renderMessage(value, options.inputs) : options.inputs?.[key] || ''];
          })
        )
      );

      const taskId = nextTaskId();
      const result = await this.context
        .executor({
          ...this.context,
          callback: (message: any) => {
            this.context.callback?.(message);

            // 如果是文本流，并 assistantId 是最后一个，则转发给上层
            if (
              hasTextStream &&
              message.type === AssistantResponseType.CHUNK &&
              message.delta.content &&
              message.assistantId &&
              message.assistantId === lastAgnetIdWithTextSteam &&
              message.taskId === taskId
            ) {
              this.context.callback?.({ ...message, ...options });
            }
          },
        } as ExecutorContext)
        .execute(callAgent.agent, {
          inputs: { ...(options.inputs || {}), ...(parameters || {}) },
          taskId,
          parentTaskId: options.taskId,
        });

      return result;
    };

    const list = await Promise.all(calledAgents.map(fn));
    const obj = Object.assign({}, ...list.flat());
    const result = outputVariables.reduce((acc, item) => {
      if (item?.name) acc[item.name] = obj[item.name];
      return acc;
    }, {} as any);

    logger.info('parallel call agent output', JSON.stringify(obj, null, 2));
    logger.info('filter call agent output', JSON.stringify(result, null, 2));

    return result;
  }
}

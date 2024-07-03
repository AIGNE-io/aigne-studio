import { logger } from '@blocklet/sdk/lib/config';

import {
  AssistantResponseType,
  ExecutionPhase,
  OutputVariable,
  ParallelCallAssistant,
  RuntimeOutputVariable,
  Tool,
} from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';

export class ParallelCallAgentExecutor extends AgentExecutorBase {
  override async process() {
    // ignore
  }

  private async getCalledAgents(agent: ParallelCallAssistant & GetAgentResult) {
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
    agent: ParallelCallAssistant & GetAgentResult,
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

  override async execute(agent: ParallelCallAssistant & GetAgentResult, options: AgentExecutorOptions) {
    if (!agent.agents || agent.agents.length === 0) {
      throw new Error('Must choose an agent to execute');
    }

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantName: agent.name,
      inputParameters: options.inputs,
    });

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantId: agent.id,
      assistantName: agent.name,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING },
    });

    const calledAgents = await this.getCalledAgents(agent);

    // 获取最后输出的文本流
    const lastAgnetIdWithTextSteam = this.getLastTextSteamAgentIdMap(calledAgents);

    const inputs = await this.prepareInputs(agent, options);

    const outputVariables = this.getOutputVariables(agent, calledAgents);
    const hasTextStream = outputVariables?.some((i) => i.name === RuntimeOutputVariable.text);

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantName: agent.name,
      inputParameters: inputs,
    });

    logger.info(JSON.stringify(calledAgents, null, 2));

    // 获取被调用的 agent
    const fn = async (callAgent: { item: Tool; agent: GetAgentResult }) => {
      const parameters = Object.fromEntries(
        await Promise.all(
          Object.entries(callAgent.item.parameters || {}).map(async ([key, value]) => {
            return [key, value ? await renderMessage(value, inputs) : inputs?.[key] || ''];
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
          inputs: { ...(inputs || {}), ...(parameters || {}) },
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

    this.context.callback?.({
      type: AssistantResponseType.CHUNK,
      taskId: options.taskId,
      assistantId: agent.id,
      delta: { object: result },
    });

    this.context.callback?.({
      type: AssistantResponseType.EXECUTE,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantId: agent.id,
      assistantName: agent.name,
      execution: { currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END },
    });

    return list;
  }
}

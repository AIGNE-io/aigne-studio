import { logger } from '@blocklet/sdk/lib/config';
import { cloneDeep } from 'lodash';

import { AssistantResponseType, CallAssistant, ExecutionPhase, RuntimeOutputVariable } from '../../types';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase, AgentExecutorOptions, ExecutorContext } from './base';

export class CallAgentExecutor extends AgentExecutorBase {
  override async process() {
    // ignore
  }

  override async execute(agent: CallAssistant & GetAgentResult, options: AgentExecutorOptions) {
    if (!agent.call) {
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

    const map = new Map();
    agent.outputVariables?.forEach((i) => {
      const output = i.from?.type === 'output' ? callAgent.outputVariables?.find((r) => r.id === i?.from?.id) : i;
      if (output) map.set(output.name, output);
    });

    callAgent.outputVariables = Array.from(map.values());

    logger.info('merge call agent output', JSON.stringify(callAgent.outputVariables, null, 2));

    // 获取被调用 agent 的输入
    const inputs = await this.prepareInputs(agent, options);
    const parameters = Object.fromEntries(
      await Promise.all(
        Object.entries(agent.call.parameters || {}).map(async ([key, value]) => {
          return [key, value ? await renderMessage(value, inputs) : inputs[key] || ''];
        })
      )
    );

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      taskId: options.taskId,
      parentTaskId: options.parentTaskId,
      assistantName: agent.name,
      inputParameters: inputs,
    });

    // 包装 this.context.callback
    const taskId = nextTaskId();
    const hasTextStream = agent.outputVariables?.some((i) => i.name === RuntimeOutputVariable.text);

    const result = await this.context
      .executor({
        ...this.context,
        callback: (message: any) => {
          this.context.callback?.(message);

          // 如果是文本流，则转发给上层
          if (
            hasTextStream &&
            message.type === AssistantResponseType.CHUNK &&
            message.delta.content &&
            message.taskId === taskId
          ) {
            this.context.callback?.({ ...message, ...options });
          }
        },
      } as ExecutorContext)
      .execute(callAgent, {
        inputs: { ...(inputs || {}), ...(parameters || {}) },
        taskId,
        parentTaskId: options.taskId,
      });

    logger.info('call agent result', JSON.stringify(result, null, 2));

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

    return result;
  }
}

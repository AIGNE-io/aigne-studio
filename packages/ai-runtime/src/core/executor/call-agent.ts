import { logger } from '@blocklet/sdk/lib/config';
import { cloneDeep } from 'lodash';

import { AssistantResponseType, CallAssistant, ExecutionPhase } from '../../types';
import { GetAgentResult, RunAssistantCallback } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class CallAgentExecutor extends AgentExecutorBase {
  override async process() {
    // ignore
  }

  private wrapCallback(originalCallback: RunAssistantCallback, taskId: string, options: AgentExecutorOptions) {
    return (message: any) => {
      // 调用原始回调
      originalCallback?.(message);

      if (message.type === AssistantResponseType.CHUNK && message.delta.content && message.taskId === taskId) {
        originalCallback?.({ ...message, ...options });
      }
    };
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

    const outputVariables = Array.from(map.values());
    callAgent.outputVariables = cloneDeep(outputVariables);

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
    this.context.callback = this.wrapCallback(this.context.callback, taskId, options);
    const result = await this.context.executor(this.context).execute(callAgent, {
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

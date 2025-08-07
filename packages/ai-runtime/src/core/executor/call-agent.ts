import { logger } from '@blocklet/sdk/lib/config';
import { get } from 'lodash';
import pick from 'lodash/pick';

import { parseIdentity, stringifyIdentity } from '../../common/aid';
import { AssistantResponseType, CallAssistant, OutputVariable, RuntimeOutputVariable, Tool } from '../../types';
import { isNonNullable } from '../../utils/is-non-nullable';
import { GetAgentResult } from '../assistant/type';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase } from './base';

function getOutputVariablePath(variables: OutputVariable[], targetId: string): string[] {
  const find = (items: OutputVariable[], path: string[] = []): string[] | null => {
    for (const item of items) {
      if (item.id === targetId) return [...path, item.name!];

      if (item.type === 'object' && item.properties) {
        const result = find(item.properties, [...path, item.name!]);
        if (result) return result;
      }
    }

    return null;
  };

  return find(variables) || [];
}

export class CallAgentExecutor extends AgentExecutorBase<CallAssistant> {
  private async getCalledAgents(agent: CallAssistant & GetAgentResult) {
    if (!agent.agents || agent.agents.length === 0) {
      throw new Error('Must choose an agent to execute');
    }

    const identity = parseIdentity(agent.identity.aid, { rejectWhenError: true });

    return await Promise.all(
      agent.agents.map(async (item) => ({
        item,
        agent: await this.context.getAgent({
          aid: stringifyIdentity({
            blockletDid: item.blockletDid || identity.blockletDid,
            projectId: item.projectId || identity.projectId,
            projectRef: identity.projectRef,
            agentId: item.id,
          }),
          working: agent.identity.working,
          rejectOnEmpty: true,
        }),
      }))
    );
  }

  private getOutputVariables(
    agent: CallAssistant & GetAgentResult,
    calledAgents: { item: Tool; agent: GetAgentResult }[]
  ) {
    const agentOutputVariables: OutputVariable[] = calledAgents.flatMap((item) => item.agent.outputVariables || []);

    const outputVariables = (agent?.outputVariables || []).map((i) => {
      if (i.from?.type === 'output') {
        const fromId = i.from.id;
        const output = agentOutputVariables.find((r) => r.id === fromId);
        if (output) return output;
      }

      return i;
    });

    return outputVariables;
  }

  override async process(options: { inputs: { [key: string]: any } }) {
    const { agent } = this;

    if (!agent.agents || agent.agents.length === 0) {
      throw new Error('Must choose an agent to execute');
    }

    const calledAgents = await this.getCalledAgents(agent);

    const outputVariables = this.getOutputVariables(agent, calledAgents);
    const outputFromResult = outputVariables.filter(
      (i): i is OutputVariable & { from: { type: 'variable'; agentInstanceId: string; outputVariableId?: string } } =>
        i.from?.type === 'variable'
    );

    const textOutput = outputVariables?.find((i) => i.name === RuntimeOutputVariable.text);

    // 获取被调用的 agent
    const fn = async (
      callAgent: { item: Tool & { instanceId?: string }; agent: GetAgentResult },
      { variables }: { variables: { [key: string]: any } }
    ) => {
      const parameters = Object.fromEntries(
        await Promise.all(
          Object.entries(callAgent.item.parameters || {}).map(async ([key, value]) => {
            return [key, value ? await this.renderMessage(value, variables) : options.inputs?.[key] || ''];
          })
        )
      );

      const taskId = nextTaskId();
      const result = await this.context
        .copy({
          callback: (message) => {
            this.context.callback?.(message);

            // 如果是文本流，并 assistantId 是最后一个，则转发给上层
            if (
              textOutput?.from?.type === 'variable' &&
              textOutput.from.agentInstanceId === callAgent.item.instanceId &&
              message.type === AssistantResponseType.CHUNK &&
              message.delta.content &&
              message.taskId === taskId
            ) {
              this.context.callback?.({ ...message, ...this.options });
            }
          },
        })
        .executor(callAgent.agent, {
          inputs: { ...(options.inputs || {}), ...(parameters || {}) },
          taskId,
          parentTaskId: this.options.taskId,
        })
        .execute();

      return result;
    };

    const obj = {};
    const accumulatedResults: { [key: string]: any } = {};

    for (const agent of calledAgents) {
      const currentAgentResult = await fn(agent, { variables: accumulatedResults });
      if (agent.item.functionName) accumulatedResults[agent.item.functionName] = currentAgentResult;

      const founds = outputFromResult.filter(
        (i) => i.from?.agentInstanceId === (agent.item.instanceId ?? agent.item.id)
      );

      Object.assign(obj, currentAgentResult);

      for (const found of founds) {
        const key = getOutputVariablePath(agent.agent.outputVariables || [], found.from.outputVariableId!);

        Object.assign(obj, {
          [found.name!]: found.from?.outputVariableId ? get(currentAgentResult, key) : currentAgentResult,
        });
      }
    }

    const result = pick(obj, outputVariables.map((i) => i.name).filter(isNonNullable));

    logger.info('parallel call agent output', JSON.stringify(obj, null, 2));
    logger.info('filter call agent output', JSON.stringify(result, null, 2));

    return result;
  }
}

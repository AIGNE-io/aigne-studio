import { AssistantYjs, RuntimeOutputVariable, RuntimeOutputVariablesSchema } from '../../types';
import { Agent } from '../api/agent';

export function getOutputVariableInitialValue<T extends RuntimeOutputVariable>(
  agent: Agent | AssistantYjs,
  output: T
): RuntimeOutputVariablesSchema[T] | undefined {
  if (!agent.outputVariables) return undefined;

  if (Array.isArray(agent.outputVariables)) {
    return agent.outputVariables.find((i) => i.name === output)?.initialValue as any;
  }

  return Object.values(agent.outputVariables).find((i) => i.data.name === output)?.data?.initialValue as any;
}

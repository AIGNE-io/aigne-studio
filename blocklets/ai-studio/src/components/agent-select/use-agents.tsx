import type { UseAgentItem } from '@app/store/agent';
import { useAgents } from '@app/store/agent';
import type { ResourceType } from '@blocklet/ai-runtime/types';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';

export interface AgentSelectFilter {
  type: ResourceType;
  excludes?: string[];
}

export function useAgentSelectOptions({ type, excludes }: AgentSelectFilter): {
  agents: UseAgentItem[];
} {
  const { agents } = useAgents({ type });

  const include = (agent: (typeof agents)[number]) => {
    if (type === 'llm-adapter') {
      if (!isLLMAdaptor(agent)) return false;
    }

    if (excludes?.length) {
      return !excludes.includes(agent.id);
    }

    return true;
  };

  return { agents: agents.filter(include) };
}

function isLLMAdaptor(agent: UseAgentItem) {
  const outputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);
  return outputVariables.some((i) => i.name === RuntimeOutputVariable.llmResponseStream);
}

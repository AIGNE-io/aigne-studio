import { UseAgentItem, useAgents } from '@app/store/agent';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';

export interface AgentSelectFilter {
  excludes?: string[];
  includes?: { type?: 'llmAdaptor' }[];
}

export function useAgentSelectOptions({ includes, excludes }: AgentSelectFilter): {
  agents: UseAgentItem[];
} {
  const { agents } = useAgents();

  const include = (agent: (typeof agents)[number]) => {
    if (includes?.length) {
      for (const i of includes) {
        if (i.type === 'llmAdaptor') {
          if (!isLLMAdaptor(agent)) return false;
        }
      }
    }

    if (excludes?.length) {
      return !excludes.includes(agent.id);
    }

    return true;
  };

  return { agents: agents.filter(include) };
}

function isLLMAdaptor(agent: UseAgentItem) {
  return agent.outputVariables?.some((i) => i.name === RuntimeOutputVariable.llmResponseStream);
}

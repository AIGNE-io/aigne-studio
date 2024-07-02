import { OutputVariable, Parameter } from '@blocklet/ai-runtime/types';
import { ResourceType } from '@blocklet/ai-runtime/types/resource';
import { joinURL } from 'ufo';

import { aigneRuntimeApi } from './api';

export interface Agent {
  id: string;
  name?: string;
  description?: string;
  parameters?: Parameter[];
  outputVariables?: OutputVariable[];
  createdBy?: string;

  identity: {
    projectId: string;
    projectRef?: string;
    blockletDid?: string;
    working?: boolean;
    agentId: string;
  };

  project: {
    id: string;
    name?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    appearance?: {
      primaryColor?: string;
      typography?: {
        fontFamily?: string;
        heading?: {
          fontFamily?: string;
        };
      };
    };
  };
}

export interface AgentWithConfig extends Agent {
  config: {
    secrets: {
      targetProjectId: string;
      targetAgentId: string;
      targetInput: Parameter;
      hasValue: boolean;
    }[];
  };
}

export async function getAgents({ type }: { type?: ResourceType }): Promise<{ agents: Agent[] }> {
  return aigneRuntimeApi
    .get(joinURL('/api/agents'), {
      params: { type },
    })
    .then((res) => res.data);
}

export async function getAgent({
  aid,
  blockletDid,
  working,
}: {
  aid: string;
  blockletDid?: string;
  working?: boolean;
}): Promise<AgentWithConfig> {
  return aigneRuntimeApi
    .get(joinURL('/api/agents', aid), {
      params: { working, blockletDid },
    })
    .then((res) => res.data);
}

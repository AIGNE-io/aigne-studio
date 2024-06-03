import { ResourceType } from '@api/libs/resource';
import { Assistant, AssistantBase, OutputVariable, Parameter } from '@blocklet/ai-runtime/types';

import api from './api';

export interface Agent {
  id: string;
  name?: string;
  type: Assistant['type'];
  description?: string;
  parameters?: Parameter[];
  outputVariables?: OutputVariable[];
  entries?: { id: string; title?: string; parameters?: { [key: string]: any } }[];
  release?: AssistantBase['release'];
  createdBy?: string;

  project: {
    id: string;
    name?: string;
    description?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };

  blocklet: {
    did: string;
  };
}

export async function getAgents({ type }: { type?: ResourceType } = {}): Promise<{ agents: Agent[] }> {
  return api.get('/api/agents', { params: { type } }).then((res) => res.data);
}

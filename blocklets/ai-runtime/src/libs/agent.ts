import { OutputVariable, Parameter } from '@blocklet/ai-runtime/types';
import { joinURL } from 'ufo';

import api from './api';

export interface Agent {
  id: string;
  name?: string;
  description?: string;
  parameters?: Parameter[];
  outputVariables?: OutputVariable[];
  createdBy?: string;

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

  config: {
    secrets: {
      targetProjectId: string;
      targetAgentId: string;
      targetInput: Parameter;
      hasValue: boolean;
    }[];
  };
}

export async function getAgent({
  aid,
  blockletDid,
  working,
}: {
  aid: string;
  blockletDid?: string;
  working?: boolean;
}): Promise<Agent> {
  return api
    .get(joinURL('/api/agents', aid), {
      params: { working, blockletDid },
    })
    .then((res) => res.data);
}

import { OutputVariable, Parameter } from '../assistant';
import { ProjectSettings } from '../resource';

export interface Agent {
  id: string;
  name?: string;
  description?: string;
  parameters?: Parameter[];
  outputVariables?: OutputVariable[];
  createdBy?: string;

  identity: {
    aid: string;
    projectId: string;
    projectRef?: string;
    blockletDid?: string;
    working?: boolean;
    agentId: string;
  };

  project: ProjectSettings;

  access?: {
    noLoginRequired?: boolean;
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

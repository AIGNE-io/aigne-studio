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
    working?: boolean;
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

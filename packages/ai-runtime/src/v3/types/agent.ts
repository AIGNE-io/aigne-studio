import { BlockBase } from './base';
import { AgentProcess } from './process';
import { TypeRef } from './type-define';
import { OrderedMap } from './utils';

export interface Agent {
  id: string;

  name?: string;

  description?: string;

  inputs?: OrderedMap<AgentInput>;

  memories?: OrderedMap<AgentMemory>;

  knowledge?: OrderedMap<AgentKnowledge>;

  processes?: OrderedMap<AgentProcess>;

  outputs?: OrderedMap<AgentOutput>;
}

export type AgentInput = BlockBase &
  TypeRef & {
    required?: boolean;
    placeholder?: string;
    defaultValue?: any;
  };

export interface AgentMemory extends BlockBase {
  memory: {
    id: string;
  };
}

export interface AgentKnowledge extends BlockBase {
  knowledge: {
    id: string;
  };
}

export interface AgentOutput extends BlockBase {
  value: { from: 'variable'; variableId: string; path?: string[] };
}

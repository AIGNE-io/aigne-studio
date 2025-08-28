import { Agent } from './agent';
import { Appearance } from './appearance';
import { Knowledge } from './knowledge';
import { Memory } from './memory';
import { TypeDefine } from './type-define';
import { OrderedMap } from './utils';

export interface Project {
  id: string;

  name?: string;

  description?: string;

  createdAt: string;

  updatedAt: string;

  createdBy: string;

  agents?: OrderedMap<Agent>;

  knowledge?: OrderedMap<Knowledge>;

  memories?: OrderedMap<Memory>;

  types?: OrderedMap<TypeDefine>;

  appearance?: Appearance;
}

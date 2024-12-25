import { OrderedRecord, isNonNullable } from '@aigne/core';

import { ProjectDefinition } from '../runtime';
import { Agent } from './agent';

export class Runtime<Agents = {}> {
  constructor(definition: ProjectDefinition) {
    this.agents = Object.fromEntries(
      OrderedRecord.map(definition.runnables, (agent) => {
        if (!agent.name) return null;

        return [agent.name, new Agent(definition, agent)];
      }).filter(isNonNullable)
    );
  }

  agents: Agents;
}

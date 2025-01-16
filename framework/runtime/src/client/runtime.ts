import { Context, ContextState, OrderedRecord, Runnable, isNonNullable } from '@aigne/core';

import { ProjectDefinition } from '../runtime';
import { Agent } from './agent';
import { getRunnableDefinition } from './api/runtime';

export class Runtime<Agents = {}, State extends ContextState = ContextState> implements Context<State> {
  constructor(
    public definition: ProjectDefinition,
    public state: State
  ) {
    this.agents = Object.fromEntries(
      OrderedRecord.map(definition.runnables, (agent) => {
        if (!agent.name) return null;

        return [agent.name, new Agent(definition, agent)];
      }).filter(isNonNullable)
    );
  }

  register(): void {
    throw new Error('Method not implemented.');
  }

  resolveDependency<T>(): T {
    throw new Error('Method not implemented.');
  }

  async resolve<T extends Runnable>(id: string): Promise<T> {
    const definition = await getRunnableDefinition({
      projectId: this.definition.id,
      agentId: id,
    });

    return new Agent(this.definition, definition) as unknown as T;
  }

  agents: Agents;
}

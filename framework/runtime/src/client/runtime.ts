import { Context, ContextState, OrderedRecord, Runnable, isNonNullable } from '@aigne/core';

import { ProjectDefinition } from '../runtime';
import { Agent } from './agent';
import { getRunnableDefinition } from './api/runtime';

export interface RuntimeOptions<_Agents extends { [name: string]: Runnable }, _State extends ContextState> {
  id?: string;

  projectDefinition?: ProjectDefinition;
}

export class Runtime<Agents extends { [name: string]: Runnable } = {}, State extends ContextState = ContextState>
  implements Context<State>
{
  constructor(public readonly options: RuntimeOptions<Agents, State>) {
    const id = options.id || options.projectDefinition?.id;
    if (!id) throw new Error('Runtime id is required');
    this.id = id;

    this.agents = Object.fromEntries(
      OrderedRecord.map(options.projectDefinition?.runnables, (agent) => {
        if (!agent.name) return null;

        return [agent.name, new Agent(this, agent)];
      }).filter(isNonNullable)
    );
  }

  id: string;

  get state(): State {
    throw new Error('Method not implemented.');
  }

  agents: Agents;

  register(): void {
    throw new Error('Method not implemented.');
  }

  async resolve<T extends Runnable>(id: string): Promise<T> {
    const definition = await getRunnableDefinition({
      projectId: this.id,
      agentId: id,
    });

    return new Agent(this, definition) as unknown as T;
  }

  resolveDependency<T>(): T {
    throw new Error('Method not implemented.');
  }
}

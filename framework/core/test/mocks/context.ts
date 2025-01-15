import { DependencyContainer, container } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';

import { Context, ContextState, LLMModel, OrderedRecord, Runnable, RunnableDefinition, TYPES } from '../../src';
import { MockLLMModel } from './llm-model';

export interface MockContextOptions {
  state?: ContextState;

  llmModel?: LLMModel | constructor<LLMModel>;
}

export class MockContext implements Context {
  constructor({ state = {}, llmModel = MockLLMModel }: MockContextOptions = {}) {
    this.state = state;

    this.container = container.createChildContainer();

    if (typeof llmModel === 'function') this.container.register(TYPES.llmModel, { useClass: llmModel });
    else this.container.register(TYPES.llmModel, { useValue: llmModel });
  }

  state: ContextState;

  container: DependencyContainer;

  resolveDependency<T>(token: string | symbol): T {
    return this.container.resolve(token);
  }

  private runnables: OrderedRecord<Runnable> = OrderedRecord.fromArray([]);

  private definitions: OrderedRecord<RunnableDefinition> = OrderedRecord.fromArray([]);

  async resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T> {
    if (typeof id === 'string') {
      const runnable = this.runnables[id];
      if (runnable) return runnable as T;
    }

    const definition = typeof id === 'string' ? this.definitions[id] : id;

    if (definition) {
      const childContainer = this.container.createChildContainer().register(TYPES.definition, { useValue: definition });

      const result = childContainer.resolve<T>(definition.type);

      childContainer.dispose();

      return result;
    }

    throw new Error(`Runnable not found: ${id}`);
  }

  register<R extends Array<RunnableDefinition | Runnable> = []>(...runnables: R): void {
    for (const runnable of runnables) {
      if (runnable instanceof Runnable) OrderedRecord.push(this.runnables, runnable);
      else OrderedRecord.push(this.definitions, runnable);
    }
  }
}

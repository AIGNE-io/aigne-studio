import {
  Context,
  ContextConfig,
  ContextState,
  FunctionAgent,
  FunctionRunner,
  LLMAgent,
  LLMDecisionAgent,
  LLMModel,
  LocalFunctionAgent,
  OrderedRecord,
  PipelineAgent,
  Runnable,
  RunnableDefinition,
  TYPES,
} from '@aigne/core';
import { DependencyContainer, container } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';

import { MockFunctionRunner } from './function-runner';
import { MockLLMModel } from './llm-model';

export interface MockContextOptions {
  state?: ContextState;

  config?: ContextConfig;

  llmModel?: LLMModel | constructor<LLMModel>;

  functionRunner?: FunctionRunner | constructor<FunctionRunner>;
}

export class MockContext implements Context {
  constructor({
    state = {},
    config = {},
    llmModel = MockLLMModel,
    functionRunner = MockFunctionRunner,
  }: MockContextOptions = {}) {
    this.state = state;
    this.config = config;

    this.container = container.createChildContainer();

    this.container.register(TYPES.context, { useValue: this });
    this.registerDependency(TYPES.llmModel, llmModel);
    this.registerDependency(TYPES.functionRunner, functionRunner);

    this.registerDependency('function_agent', FunctionAgent);
    this.registerDependency('llm_agent', LLMAgent);
    this.registerDependency('llm_decision_agent', LLMDecisionAgent);
    this.registerDependency('local_function_agent', LocalFunctionAgent);
    this.registerDependency('pipeline_agent', PipelineAgent);
  }

  private registerDependency<T>(token: string | symbol, dependency: constructor<T> | T) {
    if (typeof dependency === 'function') this.container.register(token, { useClass: dependency as constructor<T> });
    else this.container.register(token, { useValue: dependency });
  }

  state: ContextState;

  config: ContextConfig;

  container: DependencyContainer;

  resolveDependency<T>(token: string | symbol): T {
    return this.container.resolve(token);
  }

  private definitions: OrderedRecord<RunnableDefinition> = OrderedRecord.fromArray([]);

  async resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T> {
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
      OrderedRecord.pushOrUpdate(this.definitions, runnable instanceof Runnable ? runnable.definition : runnable);
    }
  }
}

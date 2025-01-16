import { join } from 'path';

import { AgentV1, agentV1ToRunnableDefinition } from '@aigne/agent-v1';
import {
  APIAgent,
  BlockletAgent,
  Context,
  ContextState,
  FunctionAgent,
  FunctionRunner,
  LLMAgent,
  LLMDecisionAgent,
  LLMModel,
  LLMModelConfiguration,
  LocalFunctionAgent,
  OrderedRecord,
  PipelineAgent,
  Runnable,
  RunnableDefinition,
  TYPES,
} from '@aigne/core';
import { readFile } from 'fs-extra';
import { glob } from 'glob';
import { produce } from 'immer';
import { merge } from 'lodash';
import { nanoid } from 'nanoid';
import { DependencyContainer, container, injectable } from 'tsyringe';
import { constructor } from 'tsyringe/dist/typings/types';
import { parse } from 'yaml';

import { BlockletLLMModel } from '../provider/blocklet-llm-model';
import { QuickJSRunner } from '../provider/quickjs-runner';
import { DeepPartial } from '../utils/partial';

export interface ProjectDefinition {
  id: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  runnables: OrderedRecord<RunnableDefinition>;
}

export interface RuntimeConfiguration {
  llmModel?: LLMModelConfiguration;
}

export interface RuntimeOptions<Agents extends { [name: string]: Runnable }, State extends ContextState> {
  id?: string;

  name?: string;

  projectDefinition?: ProjectDefinition;

  config?: RuntimeConfiguration;

  state?: State;

  agents?: Agents;

  llmModel?: LLMModel | constructor<LLMModel>;

  functionRunner?: FunctionRunner | constructor<FunctionRunner>;
}

@injectable()
export class Runtime<Agents extends { [name: string]: Runnable } = {}, State extends ContextState = ContextState>
  implements Context<State>
{
  // TODO: 拆分加载逻辑，避免 Runtime 代码臃肿
  static async load<Agents extends { [name: string]: Runnable } = {}, State extends ContextState = ContextState>(
    options: { path: string } & RuntimeOptions<Agents, State>
  ): Promise<Runtime<Agents, State>> {
    const projectFilePath = join(options.path, 'project.yaml');
    const project = parse((await readFile(projectFilePath)).toString());
    // TODO: validate parsed project

    const agentFilePaths = await glob(join(options.path, 'prompts', '**/*.yaml'));
    const runnables = await Promise.all(
      agentFilePaths.map(async (filename) => {
        const agent = parse((await readFile(filename)).toString());
        // TODO: validate parsed agent
        return agentV1ToRunnableDefinition(agent);
      })
    );

    const projectDefinition: ProjectDefinition = {
      ...project,
      runnables: OrderedRecord.fromArray(runnables),
    };

    return new Runtime({
      ...options,
      projectDefinition,
    });
  }

  constructor(public readonly options: RuntimeOptions<Agents, State> = {}) {
    this.name = options.name || options.projectDefinition?.name;
    this.id = options.id || options.projectDefinition?.id || this.name || nanoid();
    this.config = options.config || {};
    this.state = options.state || ({} as State);

    OrderedRecord.push(this.runnableDefinitions, ...OrderedRecord.toArray(options.projectDefinition?.runnables));

    this.container.register(TYPES.context, { useValue: this });
    this.container.register(TYPES.llmModelConfiguration, { useFactory: () => this.config.llmModel || {} });
    this.container.register('pipeline_agent', { useClass: PipelineAgent });
    this.container.register('llm_agent', { useClass: LLMAgent });
    this.container.register('function_agent', { useClass: FunctionAgent });
    this.container.register('llm_decision_agent', { useClass: LLMDecisionAgent });
    this.container.register('local_function_agent', { useClass: LocalFunctionAgent });
    this.container.register('api_agent', { useClass: APIAgent });
    this.container.register('blocklet_agent', { useClass: BlockletAgent });

    // NOTE: 兼容旧版的 Agent 定义，统一使用 AgentV1 来处理
    for (const type of ['function', 'agent', 'prompt', 'image', 'api', 'router', 'callAgent', 'imageBlender']) {
      this.container.register(type, { useClass: AgentV1 });
    }

    this.registerDependency(TYPES.functionRunner, options.functionRunner || QuickJSRunner);
    this.registerDependency(TYPES.llmModel, options.llmModel || BlockletLLMModel);
  }

  readonly id: string;

  readonly name?: string;

  config: RuntimeConfiguration;

  state: State;

  readonly agents: Agents = new Proxy({}, { get: (_, prop) => this.resolveSync(prop.toString()) }) as Agents;

  private container: DependencyContainer = container.createChildContainer();

  private runnables: OrderedRecord<Runnable> = OrderedRecord.fromArray([]);

  private runnableDefinitions: OrderedRecord<RunnableDefinition> = OrderedRecord.fromArray([]);

  private registerDependency<T>(token: string | symbol, dependency: constructor<T> | T) {
    if (typeof dependency === 'function') this.container.register(token, { useClass: dependency as constructor<T> });
    else this.container.register(token, { useValue: dependency });
  }

  private resolveSync<T extends Runnable>(id: string | RunnableDefinition): T {
    if (typeof id === 'string') {
      const runnable = this.runnables[id];
      if (runnable) return runnable as T;
    }

    const definition = typeof id === 'string' ? this.runnableDefinitions[id] : id;

    if (definition) {
      const childContainer = this.container.createChildContainer().register(TYPES.definition, { useValue: definition });

      const result = childContainer.resolve<T>(definition.type);

      childContainer.dispose();

      return result;
    }

    throw new Error(`Runnable not found: ${id}`);
  }

  setup(config: DeepPartial<RuntimeConfiguration>) {
    this.config = produce(this.config, (draft) => {
      merge(draft, config);
    });
  }

  register<R extends Array<RunnableDefinition | Runnable> = []>(...runnables: R): void {
    for (const runnable of runnables) {
      if (runnable instanceof Runnable) OrderedRecord.pushOrUpdate(this.runnables, runnable);
      else OrderedRecord.pushOrUpdate(this.runnableDefinitions, runnable);
    }
  }

  async resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T> {
    return this.resolveSync<T>(id);
  }

  resolveDependency<T>(token: string | symbol): T {
    return this.container.resolve(token);
  }

  copy<State extends ContextState = ContextState>(
    options: Required<Pick<RuntimeOptions<Agents, State>, 'state'>>
  ): Runtime<Agents, State> {
    const clone: Runtime<Agents, State> = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.state = options.state;

    return clone;
  }
}

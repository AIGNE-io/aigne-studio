import { join } from 'path';

import { AgentV1, agentV1ToRunnableDefinition } from '@aigne/agent-v1';
import {
  Context,
  ContextState,
  FunctionAgent,
  LLMAgent,
  LLMDecisionAgent,
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
import { DependencyContainer, container, injectable } from 'tsyringe';
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

@injectable()
export class Runtime<Agents = {}, State extends ContextState = ContextState> implements Context<State> {
  // TODO: 拆分加载逻辑，避免 Runtime 代码臃肿
  static async load<Agents = {}, State extends ContextState = ContextState>(
    options: { path: string },
    state: State
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

    const p: ProjectDefinition = {
      ...project,
      runnables: OrderedRecord.fromArray(runnables),
    };

    return new Runtime(p, state);
  }

  constructor(
    public project: ProjectDefinition,
    public state: State,
    public config: RuntimeConfiguration = {}
  ) {
    this.container.register(TYPES.context, { useValue: this });
    this.container.register('pipeline_agent', { useClass: PipelineAgent });
    this.container.register('llm_agent', { useClass: LLMAgent });
    this.container.register(TYPES.llmModel, { useClass: BlockletLLMModel });
    this.container.register('function_agent', { useClass: FunctionAgent });
    this.container.register(TYPES.functionRunner, { useClass: QuickJSRunner });
    this.container.register('llm_decision_agent', { useClass: LLMDecisionAgent });
    this.container.register('local_function_agent', { useClass: LocalFunctionAgent });
    this.container.register(TYPES.llmModelConfiguration, { useFactory: () => this.config.llmModel || {} });

    // NOTE: 兼容旧版的 Agent 定义，统一使用 AgentV1 来处理
    for (const type of ['function', 'agent', 'prompt', 'image', 'api', 'router', 'callAgent', 'imageBlender']) {
      this.container.register(type, { useClass: AgentV1 });
    }

    this.agents = new Proxy(
      {},
      {
        get: (_, prop) => {
          const agent =
            this.project.runnables?.[prop as string] ||
            OrderedRecord.find(this.project.runnables, (i) => i.name === prop.toString());

          if (!agent) throw new Error(`No such agent ${prop.toString()}`);

          return this.resolveSync(agent.id);
        },
      }
    ) as Agents;
  }

  readonly container: DependencyContainer = container.createChildContainer();

  readonly agents: Agents;

  get id() {
    return this.project.id;
  }

  get name() {
    return this.project.name;
  }

  setup(config: DeepPartial<RuntimeConfiguration>) {
    this.config = produce(this.config, (draft) => {
      merge(draft, config);
    });
  }

  protected resolveSync<T extends Runnable>(id: string | RunnableDefinition): T {
    if (typeof id === 'string') {
      const runnable = this.runnables[id];
      if (runnable) return runnable as T;
    }

    const definition = typeof id === 'string' ? this.project.runnables[id] : id;

    if (definition) {
      const childContainer = this.container.createChildContainer().register(TYPES.definition, { useValue: definition });

      const result = childContainer.resolve<T>(definition.type);

      childContainer.dispose();

      return result;
    }

    throw new Error(`Runnable not found: ${id}`);
  }

  async resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T> {
    return this.resolveSync<T>(id);
  }

  private runnables: OrderedRecord<Runnable> = OrderedRecord.fromArray([]);

  register<R extends Array<RunnableDefinition | Runnable> = []>(...runnables: R): void {
    for (const runnable of runnables) {
      if (runnable instanceof Runnable) OrderedRecord.pushOrUpdate(this.runnables, runnable);
      else OrderedRecord.pushOrUpdate(this.project.runnables, runnable);
    }
  }

  resolveDependency<T>(token: string | symbol): T {
    return this.container.resolve(token);
  }

  scope<State extends ContextState = ContextState>(state: State): Runtime<Agents, State> {
    return new Runtime(this.project, state, this.config);
  }
}

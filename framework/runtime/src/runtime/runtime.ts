import { join } from 'path';

import {
  APIAgent,
  BlockletAgent,
  Context,
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
import { AgentV1 } from '../v1/agent-v1';
import { agentV1ToRunnableDefinition } from '../v1/type';

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
export class Runtime<Agents = {}, State = {}> implements Context<State> {
  // TODO: 拆分加载逻辑，避免 Runtime 代码臃肿
  static async load<Agents = {}, State = {}>(options: { path: string }, state: State): Promise<Runtime<Agents, State>> {
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
    this.container.register('api_agent', { useClass: APIAgent });
    this.container.register('blocklet_agent', { useClass: BlockletAgent });
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
    const agent = typeof id === 'string' ? this.project.runnables?.[id] : id;
    if (!agent) throw new Error(`No such agent ${id}`);

    const childContainer = this.container.createChildContainer().register(TYPES.definition, { useValue: agent });

    const result = childContainer.resolve<Runnable>(agent.type) as T;

    childContainer.dispose();

    return result;
  }

  async resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T> {
    return this.resolveSync<T>(id);
  }

  register<A extends Array<RunnableDefinition> = []>(...definition: A) {
    OrderedRecord.pushOrUpdate(this.project.runnables, ...definition);
  }

  scope<State = {}>(state: State): Runtime<Agents, State> {
    return new Runtime(this.project, state, this.config);
  }
}

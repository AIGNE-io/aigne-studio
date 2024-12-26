import { join } from 'path';

import {
  Context,
  DataType,
  FunctionAgent,
  LLMAgent,
  OrderedRecord,
  PipelineAgent,
  Runnable,
  RunnableDefinition,
  RunnableInput,
  RunnableOutput,
  StreamTextOutputName,
  TYPES,
  isPropsNonNullable,
} from '@aigne/core';
import { readFile } from 'fs-extra';
import { glob } from 'glob';
import { DependencyContainer, container, injectable } from 'tsyringe';
import { parse } from 'yaml';

import { BlockletLLMModel } from '../model/blocklet-llm-model';
import { QuickJSRunner } from '../model/quickjs-runner';
import { AgentV1 } from '../v1/agent-v1';
import { Assistant } from '../v1/types';

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

@injectable()
export class Runtime<Agents = {}> implements Context {
  static async load(options: { path: string }) {
    const projectFilePath = join(options.path, 'project.yaml');
    const project = parse((await readFile(projectFilePath)).toString());
    // TODO: validate parsed project

    const agentFilePaths = await glob(join(options.path, 'prompts', '**/*.yaml'));
    const runnables = await Promise.all(
      agentFilePaths.map(async (filename) => {
        const agent = parse((await readFile(filename)).toString());
        // TODO: validate parsed agent

        return agent;
      })
    );

    const p: ProjectDefinition = {
      ...project,
      runnables: OrderedRecord.fromArray(
        runnables.map((i) => {
          const r: RunnableDefinition = i as RunnableDefinition;

          const a: Assistant = i as Assistant;
          if (a.parameters && !r.inputs) {
            const inputs = a.parameters
              .filter((i) => !i.hidden)
              .map((p) => ({
                ...p,
                // TODO: 映射旧版参数类型到新版参数类型
                type: p.type || 'string',
                name: p.key,
              }))
              .filter((i): i is typeof i & { type: DataType['type'] } =>
                ['string', 'number', 'boolean', 'object', 'array'].includes(i.type)
              ) as RunnableInput[];

            r.inputs = OrderedRecord.fromArray(inputs);
          }

          if (a.outputVariables && !r.outputs) {
            // TODO: 完善 outputs 的定义

            r.outputs = OrderedRecord.fromArray(
              a.outputVariables
                .map((i) => ({
                  ...i,
                  type: i.name === StreamTextOutputName ? 'string' : i.type || 'object',
                }))
                .filter(isPropsNonNullable('type'))
                .filter((i) => !i.hidden)
                .map((v) => ({
                  id: v.id,
                  name: v.name,
                  type: v.type,
                  required: v.required,
                })) as RunnableOutput[]
            );
          }

          return r;
        })
      ),
    };

    return new Runtime(p);
  }

  constructor(public project: ProjectDefinition) {
    this.container.register(TYPES.context, { useValue: this });
    this.container.register('pipeline_agent', { useClass: PipelineAgent });
    this.container.register('llm_agent', { useClass: LLMAgent });
    this.container.register(TYPES.llmModel, { useClass: BlockletLLMModel });
    this.container.register('function_agent', { useClass: FunctionAgent });
    this.container.register(TYPES.functionRunner, { useClass: QuickJSRunner });

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

          return this.resolveRunnable(agent.id);
        },
      }
    ) as Agents;
  }

  private container: DependencyContainer = container.createChildContainer();

  agents: Agents;

  get id() {
    return this.project.id;
  }

  get name() {
    return this.project.name;
  }

  resolveRunnable<T extends Runnable>(runnableId: string): T {
    const agent = this.project.runnables?.[runnableId];
    if (!agent) throw new Error(`No such agent ${runnableId}`);

    const childContainer = this.container.createChildContainer().register(TYPES.definition, { useValue: agent });

    const result = childContainer.resolve<Runnable>(agent.type) as T;

    childContainer.dispose();

    return result;
  }

  registerRunnable<T extends Runnable>(type: string, runnable: new (...args: any[]) => T) {
    this.container.register(type, { useClass: runnable });
  }

  addRunnable<T extends RunnableDefinition, A extends Array<T> = T[]>(...definition: A) {
    OrderedRecord.pushOrUpdate(this.project.runnables, ...definition);
  }
}

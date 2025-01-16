import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { Agent, AgentProcessOptions } from './agent';
import { TYPES } from './constants';
import type { Context, ContextState } from './context';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import { CreateRunnableMemory, toRunnableMemories } from './definitions/memory';
import { FunctionRunner } from './function-runner';
import { MemorableSearchOutput, MemoryItemWithScore } from './memorable';
import { RunnableDefinition } from './runnable';

@injectable()
export class FunctionAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Agent<I, O, Memories, State> {
  static create = create;

  constructor(
    @inject(TYPES.definition) public override definition: FunctionAgentDefinition,
    @inject(TYPES.context) context?: Context<State>,
    @inject(TYPES.functionRunner) public runner?: FunctionRunner<I, O, Memories, State>
  ) {
    super(definition, context);
    this.runner ??= context?.resolveDependency(TYPES.functionRunner);
  }

  async process(input: I, options: AgentProcessOptions<Memories>) {
    const {
      definition: { language, code, ...definition },
      runner,
      context,
    } = this;

    if (!runner) throw new Error('Function runner is required');
    if (!code) throw new Error('Code is required');
    if (!context) throw new Error('Context is required');

    return await runner.run(
      {
        name: definition.name || definition.id,
        language,
        code,
        input,
        memories: options.memories,
        context: { state: context.state },
      },
      { stream: true }
    );
  }
}

export interface CreateFunctionAgentOptions<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
  State extends ContextState,
> {
  context?: Context<State>;

  name?: string;

  inputs: I;

  outputs: O;

  memories?: Memories;

  language?: string;

  code: string;
}

export function create<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
  State extends ContextState,
>({
  context,
  ...options
}: CreateFunctionAgentOptions<I, O, Memories, State>): FunctionAgent<
  SchemaMapType<I>,
  SchemaMapType<O>,
  {
    [name in keyof Memories]: MemorableSearchOutput<Memories[name]['memory']>;
  },
  State
> {
  const agentId = options.name || nanoid();

  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);
  const memories = toRunnableMemories(agentId, inputs, options.memories ?? {});

  return new FunctionAgent(
    {
      id: agentId,
      name: options.name,
      type: 'function_agent',
      inputs,
      outputs,
      memories,
      language: options.language,
      code: options.code,
    },
    context
  );
}

export interface FunctionAgentDefinition extends RunnableDefinition {
  type: 'function_agent';

  language?: string;

  code?: string;
}

import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { Agent, AgentProcessOptions } from './agent';
import { TYPES } from './constants';
import type { Context, ContextState } from './context';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import { CreateRunnableMemory, toRunnableMemories } from './definitions/memory';
import { MemorableSearchOutput, MemoryItemWithScore } from './memorable';
import { RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { objectToRunnableResponseStream, runnableResponseStreamToObject } from './utils';

@injectable()
export class LocalFunctionAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends Agent<I, O, Memories, State> {
  static create<
    I extends { [name: string]: DataTypeSchema },
    O extends { [name: string]: DataTypeSchema },
    Memories extends { [name: string]: CreateRunnableMemory<I> },
    State extends ContextState = ContextState,
  >(
    options: Parameters<typeof createLocalFunctionAgentDefinition<I, O, Memories, State>>[0]
  ): LocalFunctionAgent<
    SchemaMapType<I>,
    SchemaMapType<O>,
    { [name in keyof Memories]: MemorableSearchOutput<Memories[name]['memory']> },
    State
  > {
    const definition = createLocalFunctionAgentDefinition<I, O, Memories, State>(options);

    return new LocalFunctionAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: LocalFunctionAgentDefinition<I, O, Memories, State>,
    @inject(TYPES.context) context?: Context<State>
  ) {
    super(definition, context);
  }

  async process(
    input: I,
    options: AgentProcessOptions<Memories> & { stream: true }
  ): Promise<RunnableResponseStream<O>>;
  async process(input: I, options: AgentProcessOptions<Memories> & { stream?: false }): Promise<O>;
  async process(input: I, options: AgentProcessOptions<Memories>): Promise<RunnableResponse<O>> {
    const {
      definition: { function: func },
      context,
    } = this;

    if (!func) throw new Error('Function is required');
    if (!context) throw new Error('Context is required');

    const result = await func(input, { context, memories: options.memories });

    // TODO: validate the result against the definition.outputs

    return options?.stream
      ? result instanceof ReadableStream
        ? result
        : objectToRunnableResponseStream(result)
      : result instanceof ReadableStream
        ? runnableResponseStreamToObject(result)
        : result;
  }
}

export interface CreateLocalFunctionAgentOptions<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
  State extends ContextState = ContextState,
> {
  name?: string;
  inputs: I;
  outputs: O;
  memories?: Memories;
  function?: LocalFunctionFuncType<
    SchemaMapType<I>,
    SchemaMapType<O>,
    { [key in keyof Memories]: MemorableSearchOutput<Memories[key]['memory']> },
    State
  >;
}

export function createLocalFunctionAgentDefinition<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
  State extends ContextState = ContextState,
>(
  options: CreateLocalFunctionAgentOptions<I, O, Memories, State>
): LocalFunctionAgentDefinition<
  SchemaMapType<I>,
  SchemaMapType<O>,
  { [key in keyof Memories]: MemorableSearchOutput<Memories[key]['memory']> },
  State
> {
  const agentId = options.name || nanoid();

  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);

  const memories = toRunnableMemories(agentId, inputs, options.memories || {});

  return {
    id: agentId,
    name: options.name,
    type: 'local_function_agent',
    inputs,
    outputs,
    memories,
    function: options.function,
  };
}

export interface LocalFunctionFuncType<
  I extends {} = {},
  O extends {} = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> {
  (
    input: I,
    options: {
      memories: Memories;
      context: Context<State>;
    }
  ): Promise<RunnableResponse<O>>;
}

export interface LocalFunctionAgentDefinition<
  I extends {} = {},
  O extends {} = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
  State extends ContextState = ContextState,
> extends RunnableDefinition {
  type: 'local_function_agent';

  function?: LocalFunctionFuncType<I, O, Memories, State>;
}

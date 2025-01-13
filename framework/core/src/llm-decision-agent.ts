import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import type { Context } from './context';
import { LLMModel, LLMModelInputMessage, LLMModelInputs, LLMModelOptions } from './llm-model';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { OrderedRecord, renderMessage } from './utils';
import { ExtractRunnableInputType, ExtractRunnableOutputType } from './utils/runnable-type';
import { ObjectUnionToIntersection } from './utils/union';

@injectable()
export class LLMDecisionAgent<I extends { [key: string]: any } = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<Case extends DecisionAgentCaseParameter>(
    options: Parameters<typeof createLLMDecisionAgentDefinition<Case>>[0]
  ): LLMDecisionAgent<
    ObjectUnionToIntersection<ExtractRunnableInputType<Case['runnable']>>,
    ExtractRunnableOutputType<Case['runnable']>
  > {
    const definition = createLLMDecisionAgentDefinition(options);

    return new LLMDecisionAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: LLMDecisionAgentDefinition,
    @inject(TYPES.llmModel) public model?: LLMModel,
    @inject(TYPES.context) public context?: Context
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { definition, context, model } = this;
    if (!model) throw new Error('LLM model is required');
    if (!context) throw new Error('Context is required');

    const messages = OrderedRecord.toArray(definition.messages);
    if (!messages.length) throw new Error('Messages are required');

    const cases = await Promise.all(
      OrderedRecord.map(definition.cases, async (t) => {
        if (!t.runnable?.id) throw new Error('Runnable is required');

        const runnable = await context.resolve(t.runnable.id);

        // TODO: auto generate name by llm model if needed
        const name = t.name || runnable.name;
        if (!name) throw new Error('Case name is required');

        return { name, description: t.description, runnable, input: t.input };
      })
    );

    const llmInputs: LLMModelInputs = {
      messages: messages.map(({ role, content }) => ({
        role,
        content: typeof content === 'string' ? renderMessage(content, input) : content,
      })),
      modelOptions: definition.modelOptions,
      tools: cases.map((t) => {
        // TODO: auto generate parameters by llm model if needed
        return {
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: {},
          },
        };
      }),
      toolChoice: 'required',
    };

    const { toolCalls } = await model.run(llmInputs);

    // TODO: support run multiple calls

    const functionNameToCall = toolCalls?.[0]!.function?.name;
    if (!functionNameToCall) throw new Error('No any runnable called');

    const caseToCall = cases.find((i) => i.name === functionNameToCall);
    if (!caseToCall) throw new Error('Case not found');

    // TODO: check result structure and omit undefined values
    return (await caseToCall.runnable.run(input, options)) as RunnableResponse<O>;
  }
}

export interface DecisionAgentCaseParameter<R extends Runnable = Runnable> {
  name?: string;
  description?: string;
  runnable: R;
}

export function createLLMDecisionAgentDefinition<Case extends DecisionAgentCaseParameter>(options: {
  id?: string;
  name?: string;
  messages: string;
  modelOptions?: LLMModelOptions;
  cases: Case[];
}): LLMDecisionAgentDefinition {
  const messages: OrderedRecord<LLMModelInputMessage & { id: string }> = OrderedRecord.fromArray([
    {
      id: nanoid(),
      role: 'system',
      content: options.messages,
    },
  ]);

  const cases: OrderedRecord<LLMDecisionCase> = OrderedRecord.fromArray(
    options.cases.map((c) => ({
      id: nanoid(),
      name: c.name || c.runnable.name,
      description: c.description,
      runnable: { id: c.runnable.id },
    }))
  );

  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'llm_decision_agent',
    // TODO: decision agent inputs should be the intersection of all case inputs
    inputs: OrderedRecord.fromArray([]),
    // TODO: decision agent outputs should be the union of all case outputs
    outputs: OrderedRecord.fromArray([]),
    messages,
    modelOptions: options.modelOptions,
    cases,
  };
}

export interface LLMDecisionAgentDefinition extends RunnableDefinition {
  type: 'llm_decision_agent';

  messages?: OrderedRecord<LLMModelInputMessage & { id: string }>;

  modelOptions?: LLMModelInputs['modelOptions'];

  cases?: OrderedRecord<LLMDecisionCase>;
}

export interface LLMDecisionCase {
  id: string;
  name?: string;
  description?: string;
  runnable?: {
    id?: string;
  };
  input?: {
    [inputId: string]: {
      from: 'variable';
      fromVariableId?: string;
      fromVariablePropPath?: (string | number)[];
    };
  };
}

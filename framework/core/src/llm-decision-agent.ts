import { get, isNil } from 'lodash';
import { inject, injectable } from 'tsyringe';

import { TYPES } from './constants';
import { Context } from './context';
import { LLMModel, LLMModelInputs, Role } from './llm-model';
import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { OrderedRecord, isNonNullable, renderMessage } from './utils';

@injectable()
export class LLMDecisionAgent<I extends { [key: string]: any }, O> extends Runnable<I, O> {
  constructor(
    @inject(TYPES.definition) public definition: LLMDecisionAgentDefinition,
    @inject(TYPES.llmModel) public model: LLMModel,
    @inject(TYPES.context) public context: Context
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { definition } = this;

    const messages = OrderedRecord.toArray(definition.messages);
    if (!messages.length) throw new Error('Messages are required');

    const cases = await Promise.all(
      OrderedRecord.map(definition.cases, async (t) => {
        if (!t.runnable?.id) throw new Error('Runnable is required');

        const runnable = await this.context.resolve(t.runnable.id);

        // TODO: auto generate name by llm model if needed
        const name = t.name || runnable.name;
        if (!name) throw new Error('Case name is required');

        return { name, runnable, input: t.input };
      })
    );

    const llmInputs: LLMModelInputs = {
      messages: messages.map(({ role, content }) => ({
        role,
        content: renderMessage(content, input),
      })),
      modelSettings: definition.modelSettings,
      tools: cases.map((t) => {
        // TODO: auto generate parameters by llm model if needed
        return { type: 'function', function: { name: t.name, parameters: {} } };
      }),
      toolChoice: 'required',
    };

    const { toolCalls } = await this.model.run(llmInputs);

    // TODO: support run multiple calls

    const functionNameToCall = toolCalls?.[0].function?.name;
    if (!functionNameToCall) throw new Error('No any runnable called');

    const caseToCall = cases.find((i) => i.name === functionNameToCall);
    if (!caseToCall) throw new Error('Case not found');

    // NOTE: 将 input 转换为 variables，其中 key 为 inputId，value 为 input 的值
    const variables: { [processId: string]: any } = Object.fromEntries(
      OrderedRecord.map(this.definition.inputs, (i) => {
        const value = input[i.name || i.id];
        if (isNil(value)) return null;

        return [i.id, value];
      }).filter(isNonNullable)
    );

    const inputForCase = Object.fromEntries(
      Object.entries(caseToCall.input ?? {})
        .map(([inputId, { from, fromVariableId, fromVariablePropPath }]) => {
          if (from !== 'variable' || !fromVariableId) return null;

          const v = variables[fromVariableId];
          const value = fromVariablePropPath?.length ? get(v, fromVariablePropPath) : v;

          return [inputId, value];
        })
        .filter(isNonNullable)
    );

    // TODO: check result structure and omit undefined values
    return (await caseToCall.runnable.run(inputForCase, options)) as RunnableResponse<O>;
  }
}

export interface LLMDecisionAgentDefinition extends RunnableDefinition {
  type: 'llm_decision_agent';

  messages?: OrderedRecord<{ id: string; role: Role; content: string }>;

  modelSettings?: LLMModelInputs['modelSettings'];

  cases?: OrderedRecord<LLMDecisionCase>;
}

export interface LLMDecisionCase {
  id: string;
  name?: string;
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

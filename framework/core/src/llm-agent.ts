import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { Agent, AgentProcessOptions } from './agent';
import { StreamTextOutputName, TYPES } from './constants';
import type { Context } from './context';
import { DataTypeSchema, SchemaMapType, schemaToDataType } from './definitions/data-type-schema';
import { CreateRunnableMemory, toRunnableMemories } from './definitions/memory';
import { LLMModel, LLMModelInputMessage, LLMModelInputs } from './llm-model';
import { MemorableSearchOutput, MemoryItemWithScore } from './memorable';
import { RunnableDefinition, RunnableResponse, RunnableResponseStream } from './runnable';
import { runnableResponseStreamToObject } from './utils';
import { prepareMessages } from './utils/message-utils';
import { renderMessage } from './utils/mustache-utils';
import { OrderedRecord } from './utils/ordered-map';
import { outputsToJsonSchema } from './utils/structured-output-schema';

@injectable()
export class LLMAgent<
  I extends { [name: string]: any } = {},
  O extends { [name: string]: any } = {},
  Memories extends { [name: string]: MemoryItemWithScore[] } = {},
> extends Agent<I, O, Memories> {
  static create<
    I extends { [name: string]: DataTypeSchema },
    O extends { [name: string]: DataTypeSchema },
    Memories extends { [name: string]: CreateRunnableMemory<I> },
  >(
    options: Parameters<typeof createLLMAgentDefinition<I, O, Memories>>[0]
  ): LLMAgent<
    SchemaMapType<I>,
    SchemaMapType<O>,
    { [name in keyof Memories]: MemorableSearchOutput<Memories[name]['memory']> }
  > {
    const definition = createLLMAgentDefinition(options);

    return new LLMAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: LLMAgentDefinition,
    @inject(TYPES.context) context?: Context,
    @inject(TYPES.llmModel) public model?: LLMModel
  ) {
    super(definition, context);
  }

  async process(
    input: I,
    options: AgentProcessOptions<Memories> & { stream: true }
  ): Promise<RunnableResponseStream<O>>;
  async process(input: I, options: AgentProcessOptions<Memories> & { stream?: false }): Promise<O>;
  async process(input: I, options: AgentProcessOptions<Memories>): Promise<RunnableResponse<O>> {
    const { definition, model } = this;
    if (!model) throw new Error('LLM model is required');

    const { originalMessages, messagesWithMemory } = prepareMessages(definition, input, options.memories);

    const llmInputs: LLMModelInputs = {
      messages: messagesWithMemory,
      modelOptions: definition.modelOptions,
    };

    const jsonOutput = this.runWithStructuredOutput(llmInputs);

    const textOutput = OrderedRecord.find(definition.outputs, (i) => i.name === StreamTextOutputName)
      ? await this.runWithTextOutput(llmInputs)
      : undefined;

    const updateMemories = (text?: string, json?: object) => {
      return this.updateMemories([
        ...originalMessages,
        { role: 'assistant', content: renderMessage('{{text}}\n{{json}}', { text, json }).trim() },
      ]);
    };

    if (options?.stream) {
      let $text = '';

      return new ReadableStream({
        start: async (controller) => {
          try {
            if (textOutput) {
              for await (const chunk of textOutput) {
                $text += chunk.$text || '';
                controller.enqueue({ $text: chunk.$text });
              }
            }

            const json = await jsonOutput;
            controller.enqueue({ delta: json });

            await updateMemories($text || undefined, json);
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    const [$text, json] = await Promise.all([
      textOutput ? runnableResponseStreamToObject(textOutput).then((res) => res.$text || undefined) : undefined,
      jsonOutput,
    ]);

    await updateMemories($text, json);

    return { $text, ...json };
  }

  private async runWithStructuredOutput(llmInputs: LLMModelInputs) {
    const jsonOutputs = OrderedRecord.filter(
      this.definition.outputs,
      (i) => i.name !== StreamTextOutputName // ignore `$text` output
    );
    if (!jsonOutputs.length) return null;

    const schema = outputsToJsonSchema(OrderedRecord.fromArray(jsonOutputs));

    const { model } = this;
    if (!model) throw new Error('LLM model is required');

    const response = await model.run({
      ...llmInputs,
      responseFormat: {
        type: 'json_schema',
        jsonSchema: {
          name: 'output',
          schema: schema,
          strict: true,
        },
      },
    });

    if (!response.$text) throw new Error('No text in JSON mode response');

    const json = JSON.parse(response.$text);

    // TODO: validate json with outputJsonSchema

    return json;
  }

  private async runWithTextOutput(llmInputs: LLMModelInputs) {
    const { model } = this;
    if (!model) throw new Error('LLM model is required');

    return model.run(llmInputs, { stream: true });
  }
}

/**
 * Options to create LLMAgent.
 */
export interface CreateLLMAgentOptions<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends { [name: string]: CreateRunnableMemory<I> },
> {
  /**
   * Agent name, used to identify the agent.
   */
  name?: string;

  /**
   * Input variables for this agent.
   */
  inputs: I;

  /**
   * Output variables for this agent.
   */
  outputs: O;

  /**
   * Memories to be used in this agent.
   */
  memories?: Memories;

  /**
   * Options for LLM chat model.
   */
  modelOptions?: LLMModelInputs['modelOptions'];

  /**
   * Messages to be passed to LLM chat model.
   */
  messages?: LLMModelInputMessage[];
}

/**
 * Create LLMAgent definition.
 * @param options Options to create LLMAgent.
 * @returns LLMAgent definition.
 */
export function createLLMAgentDefinition<
  I extends { [name: string]: DataTypeSchema },
  O extends { [name: string]: DataTypeSchema },
  Memories extends {
    [name: string]: CreateRunnableMemory<I> & {
      /**
       * Whether this memory is primary? Primary memory will be passed as messages to LLM chat model,
       * otherwise, it will be placed in a system message.
       *
       * Only one primary memory is allowed.
       */
      primary?: boolean;
    };
  },
>(options: CreateLLMAgentOptions<I, O, Memories>): LLMAgentDefinition {
  const agentId = options.name || nanoid();

  const inputs = schemaToDataType(options.inputs);
  const outputs = schemaToDataType(options.outputs);

  const memories = toRunnableMemories(agentId, inputs, options.memories ?? {});
  const primaryMemoryNames = Object.entries(options.memories ?? {})
    .filter(([, i]) => i.primary)
    .map(([name]) => name);

  if (primaryMemoryNames && primaryMemoryNames.length > 1) {
    throw new Error('Only one primary memory is allowed');
  }

  const messages = OrderedRecord.fromArray(
    options.messages?.map((i) => ({
      id: nanoid(),
      role: i.role,
      content: i.content,
    }))
  );

  return {
    id: agentId,
    name: options.name,
    type: 'llm_agent',
    inputs,
    outputs,
    primaryMemoryId: primaryMemoryNames?.at(0),
    memories,
    modelOptions: options.modelOptions,
    messages,
  };
}

export interface LLMAgentDefinition extends RunnableDefinition {
  type: 'llm_agent';

  primaryMemoryId?: string;

  messages?: OrderedRecord<LLMModelInputMessage & { id: string }>;

  modelOptions?: LLMModelInputs['modelOptions'];
}

import { omitBy } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { StreamTextOutputName, TYPES } from './constants';
import { DataType } from './data-type';
import { LLMModel, LLMModelInputs, Role } from './llm-model';
import {
  RunOptions,
  Runnable,
  RunnableDefinition,
  RunnableOutput,
  RunnableResponse,
  RunnableResponseStream,
} from './runnable';
import { isNonNullable, isPropsNonNullable } from './utils';
import { renderMessage } from './utils/mustache-utils';
import { OrderedRecord } from './utils/ordered-map';

@injectable()
export class LLMAgent<I extends {} = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends {} = {}, O extends {} = {}>(
    options: Parameters<typeof createLLMAgentDefinition>[0]
  ): LLMAgent<I, O> {
    const definition = createLLMAgentDefinition(options);

    return new LLMAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public definition: LLMAgentDefinition,
    @inject(TYPES.llmModel) public model?: LLMModel
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { definition, model } = this;
    if (!model) throw new Error('LLM model is required');

    const messages = OrderedRecord.toArray(definition.messages);
    if (!messages.length) throw new Error('Messages are required');

    // TODO: support comment/image for messages

    const llmInputs: LLMModelInputs = {
      messages: messages.map(({ role, content }) => ({
        role,
        content: renderMessage(content, input),
      })),
      modelSettings: definition.modelSettings,
    };

    const outputs = OrderedRecord.toArray(definition.outputs).filter(isPropsNonNullable('name'));

    const textOutput = outputs.find((i) => i.name === StreamTextOutputName);

    const jsonOutputs = outputs.filter((i) => i.name !== StreamTextOutputName);
    const outputJsonSchema = jsonOutputs.length ? outputsToJsonSchema(OrderedRecord.fromArray(jsonOutputs)) : undefined;
    const jsonOutput = outputJsonSchema
      ? model
          .run({
            ...llmInputs,
            responseFormat: outputJsonSchema && {
              type: 'json_schema',
              jsonSchema: {
                name: 'output',
                schema: outputJsonSchema,
                strict: true,
              },
            },
          })
          .then(async (response) => {
            if (!response.$text) throw new Error('No text in JSON mode response');

            const json = JSON.parse(response.$text);

            // TODO: validate json with outputJsonSchema

            return json;
          })
      : undefined;

    if (options?.stream) {
      return new ReadableStream({
        start: async (controller) => {
          try {
            if (textOutput) {
              const textStreamOutput = await model.run(llmInputs, { stream: true });
              for await (const chunk of textStreamOutput) {
                controller.enqueue({ $text: chunk.$text });
              }
            }

            controller.enqueue({ delta: await jsonOutput });
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    const text = textOutput ? await model.run(llmInputs) : undefined;

    return {
      $text: text,
      ...(await jsonOutput),
    };
  }
}

export function createLLMAgentDefinition(options: {
  id?: string;
  name?: string;
  messages?: { role: Role; content: string }[];
  modelSettings?: LLMModelInputs['modelSettings'];
  inputs?: { name: string; type: DataType['type']; required?: boolean }[];
  outputs?: { name: string; type: DataType['type']; required?: boolean }[];
}): LLMAgentDefinition {
  const inputs = OrderedRecord.fromArray(
    options.inputs?.map((i) => ({
      id: nanoid(),
      name: i.name,
      type: i.type,
      required: i.required,
    }))
  );

  const outputs = OrderedRecord.fromArray(
    options.outputs?.map((i) => ({
      id: nanoid(),
      name: i.name,
      type: i.type,
      required: i.required,
    }))
  );

  const messages = OrderedRecord.fromArray(
    options.messages?.map((i) => ({
      id: nanoid(),
      role: i.role,
      content: i.content,
    }))
  );

  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'llm_agent',
    inputs,
    outputs,
    messages,
    modelSettings: options.modelSettings,
  };
}

function outputsToJsonSchema(outputs: OrderedRecord<RunnableOutput>) {
  const outputToSchema = (output: RunnableOutput): object => {
    const properties =
      output.type === 'object' && output.properties?.$indexes.length
        ? OrderedRecord.map(output.properties, (property) => {
            if (!property.name) return null;

            const schema = outputToSchema(property);
            if (!schema) return null;

            return { schema, property };
          }).filter(isNonNullable)
        : undefined;

    return omitBy(
      {
        type: output.type,
        description: output.description,
        properties: properties?.length
          ? Object.fromEntries(properties.map((p) => [p.property.name, p.schema]))
          : undefined,
        items: output.type === 'array' && output.items ? outputToSchema(output.items) : undefined,
        additionalProperties: output.type === 'object' ? false : undefined,
        required: properties?.length
          ? properties.filter((i) => i.property.required).map((i) => i.property.name)
          : undefined,
      },
      (v) => v === undefined
    );
  };

  return outputToSchema({
    id: '',
    type: 'object',
    properties: outputs,
  });
}

export interface LLMAgentDefinition extends RunnableDefinition {
  type: 'llm_agent';

  messages?: OrderedRecord<{ id: string; role: Role; content: string }>;

  modelSettings?: LLMModelInputs['modelSettings'];
}

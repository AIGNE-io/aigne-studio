import { get, isNil } from 'lodash';
import { inject, injectable } from 'tsyringe';

import { StreamTextOutputName, TYPES } from './constants';
import { Context } from './context';
import logger from './logger';
import {
  RunOptions,
  Runnable,
  RunnableDefinition,
  RunnableOutput,
  RunnableResponse,
  RunnableResponseDelta,
  RunnableResponseStream,
} from './runnable';
import { readLatestObjectFromStream } from './utils';
import { isNonNullable } from './utils/is-non-nullable';
import { OrderedRecord } from './utils/ordered-map';

@injectable()
export class PipelineAgent<I extends { [key: string]: any }, O> extends Runnable<I, O> {
  constructor(
    @inject(TYPES.definition) public definition: PipelineAgentDefinition,
    @inject(TYPES.context) public context: Context
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    // TODO: validate the input against the definition

    const { definition, context } = this;
    const { processes } = definition;

    if (!processes?.$indexes.length) {
      throw new Error('No processes defined');
    }

    const result = new ReadableStream<RunnableResponseDelta<O>>({
      async start(controller) {
        // NOTE: 将 input 转换为 variables，其中 key 为 inputId，value 为 input 的值
        const variables: { [processId: string]: any } = Object.fromEntries(
          OrderedRecord.map(definition.inputs, (i) => {
            const value = input[i.name || i.id];
            if (isNil(value)) return null;

            return [i.id, value];
          }).filter(isNonNullable)
        );

        const outputs = OrderedRecord.toArray(definition.outputs);

        const textStreamOutput = outputs.find((i) => i.name === StreamTextOutputName);

        let result: Partial<O> = {};

        for (const process of OrderedRecord.iterator(processes)) {
          if (!process.runnable?.id) {
            logger.warn('Runnable id is required for process', process);
            continue;
          }

          const runnable = await context.resolveRunnable(process.runnable.id);
          if (!runnable) continue;

          const inputValues = Object.fromEntries(
            Object.entries(process.input ?? {})
              .map(([inputId, input]) => {
                const targetInput = runnable.definition.inputs?.[inputId];
                if (!targetInput?.name) return null;

                let value: any;

                if (input.from === 'variable') {
                  const v = variables[input.fromVariableId!];
                  value = input.fromVariablePropPath?.length ? get(v, input.fromVariablePropPath) : v;
                } else {
                  throw new Error('Unsupported input source');
                }

                return [targetInput.name, value];
              })
              .filter(isNonNullable)
          );

          const stream = await runnable.run(inputValues, { stream: true });

          const needRespondTextStream =
            textStreamOutput?.from === 'variable' && textStreamOutput.fromVariableId === process.id;
          const needRespondJsonStream = outputs.some(
            (i) => i.name !== StreamTextOutputName && i.from === 'variable' && i.fromVariableId === process.id
          );

          for await (const chunk of stream) {
            if (chunk.$text && needRespondTextStream) {
              controller.enqueue({ $text: chunk.$text });
            }

            if (chunk.delta) {
              variables[process.id] = chunk.delta;

              if (needRespondJsonStream) {
                result = Object.fromEntries(
                  OrderedRecord.map(definition.outputs, (output) => {
                    if (!output.name) return null;

                    let value: any;
                    if (output.from === 'variable') {
                      const v = variables[output.fromVariableId!];
                      value = output.fromVariablePropPath?.length ? get(v, output.fromVariablePropPath) : v;
                    } else {
                      throw new Error(`Unsupported output source ${output.from}`);
                    }

                    return [output.name, value];
                  }).filter(isNonNullable)
                );

                controller.enqueue({ delta: result });
              }
            }
          }
        }
      },
    });

    if (options?.stream) {
      return result;
    }

    const resultObject = (await readLatestObjectFromStream(result))?.delta;
    if (!resultObject) throw new Error('Unexpected null result');

    return resultObject as O;
  }
}

export interface PipelineAgentDefinition extends RunnableDefinition {
  type: 'pipeline_agent';

  processes?: OrderedRecord<PipelineAgentProcess>;

  outputs: OrderedRecord<PipelineAgentOutput>;
}

export type PipelineAgentOutput = RunnableOutput & {
  from: 'variable';
  fromVariableId?: string;
  fromVariablePropPath?: (string | number)[];
};

export type PipelineAgentProcess = {
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
};

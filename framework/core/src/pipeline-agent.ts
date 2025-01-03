import { get, isNil } from 'lodash';
import { nanoid } from 'nanoid';
import { inject, injectable } from 'tsyringe';

import { StreamTextOutputName, TYPES } from './constants';
import type { Context } from './context';
import { DataType } from './data-type';
import logger from './logger';
import {
  RunOptions,
  Runnable,
  RunnableDefinition,
  RunnableInput,
  RunnableOutput,
  RunnableResponse,
  RunnableResponseDelta,
  RunnableResponseStream,
} from './runnable';
import { readLatestObjectFromStream } from './utils';
import { isNonNullable } from './utils/is-non-nullable';
import { OrderedRecord } from './utils/ordered-map';

@injectable()
export class PipelineAgent<I extends { [key: string]: any } = {}, O extends {} = {}> extends Runnable<I, O> {
  static create<I extends {} = {}, O extends {} = {}>(
    options: Parameters<typeof createPipelineAgentDefinition>[0]
  ): PipelineAgent<I, O> {
    const definition = createPipelineAgentDefinition(options);

    return new PipelineAgent(definition);
  }

  constructor(
    @inject(TYPES.definition) public override definition: PipelineAgentDefinition,
    @inject(TYPES.context) public context?: Context
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    // TODO: validate the input against the definition

    const { definition, context } = this;
    if (!context) throw new Error('Context is required');

    const { processes } = definition;

    if (!processes?.$indexes.length) {
      throw new Error('No processes defined');
    }

    const result = new ReadableStream<RunnableResponseDelta<O>>({
      async start(controller) {
        try {
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

            const runnable = await context.resolve(process.runnable.id);
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
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
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

export interface PipelineAgentProcessParameter<I extends {} = {}, O extends {} = {}, R = Runnable<I, O>> {
  name?: string;
  runnable: R;
  input?: {
    [key: string]:
      | {
          fromVariable: string;
          fromVariablePropPath?: string[];
        }
      | undefined;
  };
}

export function createPipelineAgentDefinition(options: {
  id?: string;
  name?: string;
  inputs?: { name: string; type: DataType['type']; required?: boolean }[];
  outputs: {
    name: string;
    type: DataType['type'];
    required?: boolean;
    fromVariable: string;
    fromVariablePropPath?: string[];
  }[];
  processes?: PipelineAgentProcessParameter[];
}): PipelineAgentDefinition {
  const inputs: OrderedRecord<RunnableInput> = OrderedRecord.fromArray(
    options.inputs?.map((i) => ({
      id: nanoid(),
      name: i.name,
      type: i.type,
      required: i.required,
    }))
  );

  const processes: OrderedRecord<PipelineAgentProcess> = OrderedRecord.fromArray([]);

  for (const p of options.processes || []) {
    OrderedRecord.push(processes, {
      id: nanoid(),
      name: p.name || p.runnable?.name,
      runnable: { id: p.runnable.id },
      input: Object.fromEntries(
        OrderedRecord.map<[string, NonNullable<PipelineAgentProcess['input']>[string]] | null, DataType>(
          p.runnable.definition.inputs,
          (inputOfProcess) => {
            const i = p.input?.[inputOfProcess.name || inputOfProcess.id];
            if (!i) {
              if (inputOfProcess.required) {
                throw new Error(
                  `Input ${inputOfProcess.name || inputOfProcess.id} for case ${p.runnable.name || p.runnable.id} is required`
                );
              }

              // ignore optional input
              return null;
            }

            const inputFromPipeline =
              OrderedRecord.find(inputs, (input) => input.name === i.fromVariable) ||
              OrderedRecord.find(processes, (p) => p.name === i.fromVariable);

            if (!inputFromPipeline) throw new Error(`Input ${i.fromVariable} not found`);

            return [
              inputOfProcess.id,
              {
                from: 'variable',
                fromVariableId: inputFromPipeline.id,
                fromVariablePropPath: i.fromVariablePropPath,
              },
            ];
          }
        ).filter(isNonNullable)
      ),
    });
  }

  const outputs: OrderedRecord<PipelineAgentOutput> = OrderedRecord.fromArray<PipelineAgentOutput>(
    options.outputs.map((output) => {
      const from =
        OrderedRecord.find(inputs, (i) => i.name === output.fromVariable) ||
        OrderedRecord.find(processes, (p) => p.name === output.fromVariable);

      if (!from) throw new Error(`Output ${output.name} not found in inputs or processes`);

      return {
        id: nanoid(),
        name: output.name,
        type: output.type,
        required: output.required,
        from: 'variable',
        fromVariableId: from.id,
        fromVariablePropPath: output.fromVariablePropPath,
      };
    })
  );

  return {
    id: options.id || options.name || nanoid(),
    name: options.name,
    type: 'pipeline_agent',
    inputs,
    outputs,
    processes,
  };
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

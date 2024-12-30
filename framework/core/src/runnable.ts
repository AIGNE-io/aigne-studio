import { DataType } from './data-type';
import { OrderedRecord } from './utils/ordered-map';

export interface RunOptions {
  stream?: boolean;
}

export interface RunnableResponseDelta<T> {
  $text?: string;
  delta?: Partial<T>;
}

export type RunnableResponseStream<T> = ReadableStream<RunnableResponseDelta<T>>;

export type RunnableResponse<T> = T | RunnableResponseStream<T>;

export abstract class Runnable<I extends { [key: string]: any } = object, O = object> {
  constructor(public definition: RunnableDefinition) {
    this.inputs = Object.fromEntries(
      OrderedRecord.map(definition.inputs, (i) => [i.name || i.id, i])
    ) as typeof this.inputs;
    this.outputs = Object.fromEntries(
      OrderedRecord.map(definition.outputs, (i) => [i.name || i.id, i])
    ) as typeof this.outputs;
  }

  get id() {
    return this.definition.id;
  }

  get name() {
    return this.definition.name || this.definition.id;
  }

  inputs: { [key in keyof I]: DataType };

  outputs: { [key in keyof O]: DataType };

  abstract run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  abstract run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  abstract run(input: I, options?: RunOptions): Promise<RunnableResponse<O>>;
}

export interface RunnableDefinition {
  id: string;

  type: string;

  name?: string;

  description?: string;

  inputs: OrderedRecord<RunnableInput>;

  outputs: OrderedRecord<RunnableOutput>;
}

export type RunnableInput = DataType;

export type RunnableOutput = DataType;

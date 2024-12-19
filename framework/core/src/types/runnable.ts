export interface RunOptions {
  stream?: boolean;
}

export interface RunnableResponseDelta<T> {
  $text?: string;
  delta?: Partial<T>;
}

export type RunnableResponseStream<T> = ReadableStream<RunnableResponseDelta<T>>;

export type RunnableResponse<T> = T | RunnableResponseStream<T>;

export interface Runnable<I extends { [key: string]: any } = object, O = object> {
  run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  run(input: I, options?: RunOptions): Promise<RunnableResponse<O>>;
}

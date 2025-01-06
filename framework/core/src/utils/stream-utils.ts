import { RunnableResponseStream, isRunnableResponseDelta } from '../runnable';

export function objectToRunnableResponseStream<T extends { [key: string]: any }>(obj: T): RunnableResponseStream<T> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ delta: obj });
      controller.close();
    },
  });
}

export async function runnableResponseStreamToObject<T extends { [key: string]: any }>(
  stream: RunnableResponseStream<T>
): Promise<T> {
  let $text = '';
  const lastValue: T = {} as T;

  for await (const value of stream) {
    if (isRunnableResponseDelta(value)) {
      $text += value.$text || '';
      Object.assign(lastValue, value.delta);
    }
  }

  Object.assign(lastValue, { $text: lastValue.$text || $text || undefined });

  return lastValue;
}

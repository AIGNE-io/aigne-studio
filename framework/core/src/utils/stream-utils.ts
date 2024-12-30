export function objectToStream<T>(obj: T): ReadableStream<T> {
  return new ReadableStream<T>({
    start(controller) {
      controller.enqueue(obj);
      controller.close();
    },
  });
}

export async function readLatestObjectFromStream<T>(stream: ReadableStream<T>): Promise<T | undefined> {
  let lastValue: T | undefined;

  for await (const value of stream) {
    lastValue = value;
  }

  return lastValue;
}

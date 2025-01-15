import { RunnableResponse, RunnableResponseStream, isRunnableResponseDelta } from '../runnable';

export function objectToRunnableResponseStream<T extends { [key: string]: any }>(obj: T): RunnableResponseStream<T> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({ $text: obj['$text'] || undefined, delta: obj });
      controller.close();
    },
  });
}

export async function runnableResponseStreamToObject<T extends { [key: string]: any }>(
  stream: RunnableResponseStream<T>
): Promise<T> {
  let $text = '';
  const result: T = {} as T;

  for await (const value of stream) {
    if (isRunnableResponseDelta(value)) {
      $text += value.$text || '';
      Object.assign(result, value.delta);
    }
  }

  Object.assign(result, { $text: result.$text || $text || undefined });

  return result;
}

/**
 * Extracts the outputs from a runnable output stream and run the
 * resolve function on the result before the stream closes. It can be
 * used to update the memories of an agent.
 * @param output The runnable output stream or object
 * @param resolve The function to run on the result
 * @returns The runnable output stream or object
 */
export async function extractOutputsFromRunnableOutput<T extends { [key: string]: any }>(
  output: RunnableResponse<T>,
  resolve: (result: T) => Promise<void> | void
): Promise<typeof output> {
  if (!(output instanceof ReadableStream)) {
    await resolve(output);
    return output;
  }

  return new ReadableStream({
    async start(controller) {
      try {
        let result: T = {} as T;
        let $text = '';

        for await (const value of output) {
          if (isRunnableResponseDelta(value)) {
            $text += value.$text || '';
            Object.assign(result, value.delta);
          }
        }

        Object.assign(result, { $text: result.$text || $text || undefined });

        controller.enqueue({ $text: result.$text, delta: result });

        await resolve(result);
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}

import { RunnableResponseDelta } from '@aigne/core';
import { createFetch } from '@blocklet/js-sdk';

const fetch = createFetch();

const api: typeof fetch = (...args) =>
  fetch(...args).then(async (result) => {
    if (!result.ok) {
      let message: string | undefined;

      try {
        const json = await result.json();
        const msg = json.error?.message || json.message;
        if (msg && typeof msg === 'string') {
          message = msg;
        }
      } catch {
        // ignore
      }

      throw new Error(message || `Failed to fetch url ${args[0]} with status ${result.status}`);
    }

    return result;
  });

export default api;

export class RunnableStreamParser<O> extends TransformStream<RunnableResponseDelta<O>, RunnableResponseDelta<O>> {
  private $text = '';

  private delta = {};

  constructor() {
    super({
      transform: (chunk, controller) => {
        if (typeof chunk.$text === 'string' && chunk.$text) {
          this.$text += chunk.$text;
        }

        Object.assign(this.delta, chunk.delta, { $text: this.$text || undefined });

        controller.enqueue({ ...chunk, delta: { ...this.delta } });
      },
    });
  }
}

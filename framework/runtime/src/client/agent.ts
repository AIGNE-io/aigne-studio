import { IAgent, RunOptions, RunnableResponse, RunnableResponseDelta, RunnableResponseStream } from '@aigne/core';
import { joinURL } from 'ufo';

import api from './api';
import { EventSourceParserStream } from './utils/event-stream';

export class Agent<I extends object = object, O = object> implements IAgent<I, O> {
  constructor(
    private projectId: string,
    private agentId: string
  ) {}

  async run(inputs: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(inputs: I, options?: RunOptions & { stream?: boolean }): Promise<O>;
  async run(inputs: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const url = joinURL('/aigne', this.projectId, 'agents', this.agentId, 'run');
    const body = { options, inputs };

    const result = await api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

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

      throw new Error(message || `Failed to run agent ${this.agentId} with status ${result.status}`);
    }

    if (!options?.stream) {
      return await result.json();
    }

    let $text = '';
    const delta = {};

    return result
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())
      .pipeThrough(
        new TransformStream<RunnableResponseDelta<O>, RunnableResponseDelta<O>>({
          transform: (chunk, controller) => {
            if (typeof chunk.$text === 'string' && chunk.$text) {
              $text += chunk.$text;
            }

            Object.assign(delta, chunk.delta, { $text: $text || undefined });

            controller.enqueue({ ...chunk, delta: { ...delta } });
          },
        })
      );
  }
}

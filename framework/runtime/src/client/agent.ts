import { RunOptions, Runnable, RunnableDefinition, RunnableResponse, RunnableResponseStream } from '@aigne/core';
import { joinURL } from 'ufo';

import { ProjectDefinition } from '../runtime';
import { fetchApi } from './api/api';
import { EventSourceParserStream, RunnableStreamParser } from './utils/event-stream';

export class Agent<I extends {} = {}, O extends {} = {}> extends Runnable<I, O> {
  constructor(
    private projectDefinition: ProjectDefinition,
    definition: RunnableDefinition
  ) {
    super(definition);
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: boolean }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const url = joinURL('/api/aigne', this.projectDefinition.id, 'agents', this.id, 'run');
    const body = { input, options };

    const result = await fetchApi(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!options?.stream) {
      return await result.json();
    }

    return result
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())
      .pipeThrough(new RunnableStreamParser());
  }
}

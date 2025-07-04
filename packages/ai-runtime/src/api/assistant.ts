import { fetchEventSource } from '@microsoft/fetch-event-source';
import { joinURL } from 'ufo';

import { RunAssistantResponse } from '../types';
import { Assistant } from '../types/assistant';
import { aiStudioApi } from './api';

export interface AssistantIdentifier {
  projectId: string;
  gitRef: string;
  assistantId: string;
  working?: boolean;
}

export interface AssistantInfo extends Pick<Assistant, 'id' | 'name' | 'parameters'> {}

export async function getAssistant({
  projectId,
  gitRef,
  assistantId,
  working,
}: AssistantIdentifier): Promise<AssistantInfo> {
  return aiStudioApi
    .get(joinURL('/api/projects', projectId, 'refs', gitRef, 'assistants', assistantId), {
      params: { working },
    })
    .then((res) => res.data);
}

export async function runAssistant<
  T = {
    aid: string;
    working?: boolean;
    parameters?: { [key: string]: string | number };
    sessionId?: string;
    debug?: boolean;
  },
>({
  url,
  ...input
}: {
  url: string;
} & T) {
  return new ReadableStream<RunAssistantResponse>({
    async start(controller) {
      await fetchEventSource(url, {
        openWhenHidden: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        onmessage(event) {
          const data = JSON.parse(event.data);
          controller.enqueue(data);
        },
        async onopen(response) {
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('text/event-stream')) {
            let error: string | undefined;
            try {
              const json = await response.json();
              error = json.error?.message || json.message;
            } catch {
              /* empty */
            }
            throw new Error(error || 'Call AI failed');
          }
        },
        onerror(err) {
          throw err;
        },
        onclose() {
          controller.close();
        },
      });
    },
  });
}

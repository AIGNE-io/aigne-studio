import { createImageGenerationApi, createStatusApi, createTextCompletionApi } from '@blocklet/ai-kit';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ResponseSSEV2 } from 'api/src/routes/ai-v2';
import { joinURL } from 'ufo';

import axios from './api';

export type { ImageGenerationSize } from '@blocklet/ai-kit';

export const getAIStatus = createStatusApi({ axios, path: '/api/ai/status' });

export const textCompletions = createTextCompletionApi({ axios, path: '/api/ai/completions' });

export const imageGenerations = createImageGenerationApi({ axios, path: '/api/ai/image/generations' });

export async function callAI(input: {
  projectId: string;
  ref: string;
  working?: boolean;
  assistantId: string;
  parameters?: { [key: string]: string | number };
}) {
  const prefix = blocklet?.prefix || '';

  return new ReadableStream<ResponseSSEV2>({
    async start(controller) {
      await fetchEventSource(joinURL(prefix, '/api/ai/call/v2'), {
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
          if (contentType !== 'text/event-stream') {
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

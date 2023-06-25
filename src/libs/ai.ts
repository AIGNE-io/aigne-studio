import { createImageGenerationApi, createStatusApi, createTextCompletionApi } from '@blocklet/ai-kit';
import { fetchEventSource } from '@microsoft/fetch-event-source';

import { Template } from '../../api/src/store/templates';
import axios from './api';

export type { ImageGenerationSize } from '@blocklet/ai-kit';

export const getAIStatus = createStatusApi({ axios, path: '/api/ai/status' });

export const textCompletions = createTextCompletionApi({ axios, path: '/api/ai/completions' });

export const imageGenerations = createImageGenerationApi({ axios, path: '/api/ai/image/generations' });

export async function callAI(
  input: {
    parameters?: { [key: string]: string | number };
  } & (
    | {
        templateId: string;
        template?: undefined;
      }
    | {
        templateId?: undefined;
        template: Pick<Template, 'type' | 'prompts' | 'datasets' | 'branch'>;
      }
  )
) {
  const prefix = blocklet?.prefix || '';

  return new ReadableStream<string | { type: 'text'; text: string } | { type: 'images'; images: { url: string }[] }>({
    async start(controller) {
      await fetchEventSource(`${prefix}/api/ai/call`, {
        openWhenHidden: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        onmessage(event) {
          const data = JSON.parse(event.data);
          if (data.type === 'delta') {
            controller.enqueue(data.delta);
          } else {
            controller.enqueue(data);
          }
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

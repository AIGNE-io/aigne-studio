import { fetchEventSource } from '@microsoft/fetch-event-source';
import { joinURL } from 'ufo';

import type { TemplateIdentifier } from '../components/AIForm/state';
import { Template } from '../types/template';
import { AIStudioBaseUrl, aiStudioApi } from './api';

export interface PublicTemplate extends Pick<Template, 'id' | 'name' | 'type' | 'parameters'> {}

export async function getTemplate({
  projectId,
  gitRef,
  templateId,
  working,
}: TemplateIdentifier): Promise<PublicTemplate> {
  return aiStudioApi
    .get(joinURL('/api/projects', projectId, 'refs', gitRef, 'templates', templateId), {
      params: { working },
    })
    .then((res) => res.data);
}

export async function executeTemplate(input: {
  projectId: string;
  gitRef: string;
  templateId: string;
  working?: boolean;
  parameters?: { [key: string]: string | number | undefined };
}) {
  return new ReadableStream<
    | string
    | { type: 'text'; text: string }
    | { type: 'images'; images: { url: string }[] }
    | { type: 'next'; delta: string; templateId: string; templateName: string }
    | { type: 'call'; delta: string; templateId: string; variableName: string }
  >({
    async start(controller) {
      await fetchEventSource(joinURL(AIStudioBaseUrl, '/api/ai/call'), {
        openWhenHidden: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        onmessage(event) {
          const data = JSON.parse(event.data);
          if (data.type === 'delta') {
            controller.enqueue(data.delta);
          } else if (data.type === 'next') {
            controller.enqueue(data);
          } else if (data.type === 'call') {
            controller.enqueue(data);
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

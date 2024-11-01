import { AssistantResponseType, RunAssistantResponse } from '@blocklet/ai-runtime/types';
import { ResourceType } from '@blocklet/ai-runtime/types/resource';
import { Agent, AgentWithConfig } from '@blocklet/ai-runtime/types/runtime/agent';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { joinURL } from 'ufo';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../constants';
import { aigneRuntimeApi, aigneStudioApi, getMountPoint } from './api';

export type { Agent, AgentWithConfig };

type Deployment = {
  id: string;
  createdBy: string;
  updatedBy: string;
  projectId: string;
  projectRef: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
  access: 'public' | 'private';
  categories: { id: string; name: string; slug: string }[];
  orderIndex: number;
};

export async function getAgents({
  type,
  from,
}: {
  type?: ResourceType;
  from?: 'aigne-studio';
}): Promise<{ agents: Agent[] }> {
  if (from === 'aigne-studio') {
    return aigneStudioApi.get('/api/agents').then((res) => res.data);
  }

  return aigneRuntimeApi.get('/api/agents', { params: { type } }).then((res) => res.data);
}

export async function getAgent({
  aid,
  blockletDid,
  working,
}: {
  aid: string;
  blockletDid?: string;
  working?: boolean;
}): Promise<AgentWithConfig> {
  return aigneRuntimeApi
    .get(joinURL('/api/agents', aid), {
      params: { working, blockletDid },
    })
    .then((res) => res.data);
}

export async function getAgentByDeploymentId({
  deploymentId,
  working,
}: {
  deploymentId: string;
  working?: boolean;
}): Promise<AgentWithConfig & { deployment: Deployment }> {
  return aigneStudioApi
    .get(joinURL('/api/deployments', deploymentId), {
      params: { working },
    })
    .then((res) => res.data);
}

export interface RunAgentInput {
  blockletDid?: string;
  working?: boolean;
  aid: string;
  sessionId?: string;
  inputs?: { [key: string]: any };
  appUrl?: string;
}

export async function runAgent({
  ...input
}: RunAgentInput & { responseType?: undefined }): Promise<{ [key: string]: any }>;
export async function runAgent({
  ...input
}: RunAgentInput & { responseType: 'stream' }): Promise<ReadableStream<RunAssistantResponse>>;
export async function runAgent({
  ...input
}: RunAgentInput & { responseType: 'text-stream' }): Promise<ReadableStream<string>>;
export async function runAgent({
  responseType,
  ...input
}: RunAgentInput & { responseType?: 'stream' | 'text-stream' }) {
  const path = '/api/ai/call';

  if (responseType === 'stream' || responseType === 'text-stream') {
    const stream = new ReadableStream<RunAssistantResponse>({
      async start(controller) {
        await fetchEventSource(joinURL(getMountPoint(AIGNE_RUNTIME_COMPONENT_DID), path), {
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

    if (responseType === 'stream') return stream;

    return stream.pipeThrough(
      new TransformStream<RunAssistantResponse, string>({
        transform: (chunk, controller) => {
          if (chunk.type === AssistantResponseType.CHUNK && chunk.delta.content) {
            controller.enqueue(chunk.delta.content);
          }
        },
      })
    );
  }

  return aigneRuntimeApi.post(path, input).then((res) => res.data);
}

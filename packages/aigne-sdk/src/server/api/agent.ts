import { ReadableStream, TextDecoderStream } from 'stream/web';

import { EventSourceParserStream, readableToWeb } from '@blocklet/ai-kit/api/utils/event-stream';
import { AssistantResponseType, RunAssistantResponse } from '@blocklet/ai-runtime/types';
import { ResourceType } from '@blocklet/ai-runtime/types/resource';
import { call } from '@blocklet/sdk/lib/component';
import { joinURL } from 'ufo';

import type { Agent, AgentWithConfig, RunAgentInput } from '../../api/agent';
import { AIGNE_RUNTIME_COMPONENT_DID, AIGNE_STUDIO_COMPONENT_DID } from '../../constants';
import { User } from './auth';

export async function getAgents({
  type,
  from,
}: {
  type?: ResourceType;
  from?: 'aigne-studio';
}): Promise<{ agents: Agent[] }> {
  if (from === 'aigne-studio') {
    return call({ name: AIGNE_STUDIO_COMPONENT_DID, method: 'GET', path: '/api/agents' }).then((res) => res.data);
  }

  return call({ name: AIGNE_RUNTIME_COMPONENT_DID, method: 'GET', path: '/api/agents', params: { type } }).then(
    (res) => res.data
  );
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
  return call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    method: 'GET',
    path: joinURL('/api/agents', aid),
    params: { working, blockletDid },
  }).then((res) => res.data);
}

export interface RunAgentInputServer extends RunAgentInput {
  user: User;
  runType?: 'cron' | 'webhook' | 'agent';
}

export async function runAgent(
  input: RunAgentInputServer & { responseType?: undefined }
): Promise<{ [key: string]: any }>;
export async function runAgent(
  input: RunAgentInputServer & { responseType: 'stream' }
): Promise<ReadableStream<RunAssistantResponse>>;
export async function runAgent({ user, responseType, ...input }: RunAgentInputServer & { responseType?: 'stream' }) {
  const path = '/api/ai/call';
  const { runType, ...rest } = input;

  const request: Parameters<typeof call>[0] = {
    name: AIGNE_RUNTIME_COMPONENT_DID,
    method: 'POST',
    path,
    params: { userId: user.did, runType },
    data: rest,
  };

  const retryOptions: Parameters<typeof call>[1] = {
    maxTimeout: 3 * 60 * 1000,
    retries: 0,
  };

  if (responseType === 'stream') {
    const res = await call(
      {
        ...request,
        headers: { ...request.headers, accept: 'text/event-stream' },
        responseType: 'stream',
      },
      retryOptions
    );

    const stream = readableToWeb(res.data)
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream<RunAssistantResponse>());

    return new ReadableStream<RunAssistantResponse>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === AssistantResponseType.ERROR) {
              const e = new Error(chunk.error.message);
              controller.error(e);
              break;
            }
            controller.enqueue(chunk);
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }

  return call({ ...request }, retryOptions).then((res) => res.data);
}

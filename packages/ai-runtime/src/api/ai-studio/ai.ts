import type { IncomingMessage } from 'http';
import { ReadableStream, TextDecoderStream } from 'stream/web';

import { EventSourceParserStream, readableToWeb } from '@blocklet/aigne-hub/api/utils/event-stream';
import { call } from '@blocklet/sdk/lib/component';
import { AxiosResponse } from 'axios';

import { AssistantResponseType, RunAssistantChunk, RunAssistantError, RunAssistantResponse } from '../../types';

export interface CallAssistantInput {
  projectId: string;
  ref: string;
  working?: boolean;
  assistantId: string;
  parameters: { [key: string]: any };
  sessionId?: string;
}

export async function callAssistant(
  input: CallAssistantInput,
  options?: { responseType?: undefined }
): Promise<{ content: string; images: RunAssistantChunk['delta']['images'] | null }>;
export async function callAssistant(
  input: CallAssistantInput,
  options: { responseType: 'stream' }
): Promise<AxiosResponse<IncomingMessage, any>>;
export async function callAssistant(
  input: CallAssistantInput,
  options: { responseType: 'event-stream' }
): Promise<ReadableStream<Exclude<RunAssistantResponse, RunAssistantError>>>;
export async function callAssistant(
  input: CallAssistantInput,
  options: { responseType: 'text-stream' }
): Promise<ReadableStream<string>>;
export async function callAssistant(
  input: CallAssistantInput,
  options?: { responseType?: undefined | 'stream' | 'event-stream' | 'text-stream' }
): Promise<
  | { content: string; images: RunAssistantChunk['delta']['images'] | null }
  | AxiosResponse<IncomingMessage, any>
  | ReadableStream<Exclude<RunAssistantResponse, RunAssistantError>>
  | ReadableStream<string>
> {
  const response = call({
    name: 'ai-studio',
    path: '/api/ai/call',
    data: input,
    headers: { Accept: 'text/event-stream' },
    responseType: 'stream',
  });

  if (options?.responseType === 'stream') return response as any;

  const stream = toEventStream((await response).data);

  if (options?.responseType === 'event-stream') {
    return stream;
  }

  if (options?.responseType === 'text-stream') {
    return new ReadableStream<string>({
      async start(controller) {
        try {
          let mainTaskId: string | undefined;

          for await (const chunk of stream) {
            mainTaskId ??= chunk.taskId;

            if (mainTaskId === chunk.taskId && chunk.type === AssistantResponseType.CHUNK) {
              controller.enqueue(chunk.delta.content || '');
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }

  let mainTaskId: string | undefined;
  let content = '';
  const images: NonNullable<RunAssistantChunk['delta']['images']> = [];

  for await (const chunk of stream) {
    mainTaskId ??= chunk.taskId;
    if (mainTaskId === chunk.taskId && chunk.type === AssistantResponseType.CHUNK) {
      content += chunk.delta.content || '';
      if (chunk.delta.images) images.push(...chunk.delta.images);
    }
  }

  return {
    content,
    images: images.length ? images : null,
  };
}

function toEventStream(data: IncomingMessage) {
  return new ReadableStream<Exclude<RunAssistantResponse, RunAssistantError>>({
    async start(controller) {
      try {
        const stream = readableToWeb(data)
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(new EventSourceParserStream<RunAssistantResponse>());

        for await (const chunk of stream) {
          if (chunk.type === AssistantResponseType.ERROR) {
            controller.error(new Error(chunk.error.message));
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

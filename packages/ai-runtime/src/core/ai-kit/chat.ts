import { Readable } from 'stream';
import { ReadableStream, TextDecoderStream } from 'stream/web';

import { call } from '@blocklet/sdk/lib/component';

import { EventSourceParserStream } from './utils';

export type ChatCompletionResponse = ChatCompletionChunk | ChatCompletionError;

export interface ChatCompletionChunk {
  delta: {
    role?: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    toolCalls?: {
      id?: string;
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    }[];
  };
}

export interface ChatCompletionError {
  error: {
    message: string;
  };
}

export function isChatCompletionChunk(data: ChatCompletionResponse): data is ChatCompletionChunk {
  return typeof (data as ChatCompletionChunk).delta === 'object';
}

export function isChatCompletionError(data: ChatCompletionResponse): data is ChatCompletionError {
  return typeof (data as ChatCompletionError).error === 'object';
}

export interface ChatCompletionInput {
  stream?: boolean;
  model?: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  tools?: {
    type: 'function';
    function: {
      name: string;
      parameters: Record<string, unknown>;
      description?: string;
    };
  }[];
  toolChoice?: 'none' | 'auto';
  messages: (
    | { role: 'system'; content: string }
    | {
        role: 'user';
        content: string;
      }
    | {
        role: 'assistant';
        content: string;
        toolCalls?: {
          id: string;
          type: 'function';
          function: {
            name: string;
            arguments: string;
          };
        }[];
      }
    | {
        content: string | null;
        role: 'tool';
        toolCallId: string;
      }
  )[];
}

export async function callAIKitChatCompletions(input: ChatCompletionInput) {
  const response = await call({
    name: 'ai-kit',
    method: 'POST',
    path: '/api/v1/sdk/completions',
    headers: { Accept: 'text/event-stream' },
    data: input,
    responseType: 'stream',
  });

  const stream = Readable.toWeb(response.data)
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  return new ReadableStream<ChatCompletionChunk>({
    async start(controller) {
      for await (const { data } of stream) {
        try {
          if (data) {
            const json = JSON.parse(data) as ChatCompletionResponse;
            if (isChatCompletionError(json)) {
              controller.error(new Error(json.error.message));
              return;
            }
            controller.enqueue(json);
          }
        } catch (error) {
          console.error('parse ai response error', error, data);
        }
      }
      controller.close();
    },
  });
}

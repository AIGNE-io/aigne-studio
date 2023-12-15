import { ReadableStream, TextDecoderStream } from 'stream/web';

import { call } from '@blocklet/sdk/lib/component';

import { EventSourceParserStream, ReadableStreamFromNodeJs } from './utils';

export interface ChatCompletionChunk {
  delta: {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string | null;
    toolCalls?: {
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }[];
  };
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

  const stream = new ReadableStreamFromNodeJs(response.data)
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  return new ReadableStream<ChatCompletionChunk>({
    async start(controller) {
      for await (const { data } of stream) {
        try {
          if (data) {
            controller.enqueue(JSON.parse(data) as ChatCompletionChunk);
          }
        } catch (error) {
          console.error('parse ai response error', error, data);
        }
      }
      controller.close();
    },
  });
}

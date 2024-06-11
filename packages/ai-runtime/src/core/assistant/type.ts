import { ReadableStream } from 'stream/web';

import { ChatCompletionInput, ChatCompletionResponse } from '@blocklet/ai-kit/api/types/chat';
import { ImageGenerationInput } from '@blocklet/ai-kit/api/types/image';

import { Assistant, OnTaskCompletion, RunAssistantResponse } from '../../types';

export type RunAssistantCallback = (e: RunAssistantResponse) => void;

export class ToolCompletionDirective extends Error {
  type: OnTaskCompletion;

  constructor(message: string, type: OnTaskCompletion) {
    super(message);
    this.type = type;
  }
}

export interface GetAssistant {
  (
    assistantId: string,
    options: { blockletDid?: string; projectId?: string; rejectOnEmpty: true | Error }
  ): Promise<Assistant & { project: { id: string } }>;
  (
    assistantId: string,
    options?: { blockletDid?: string; projectId?: string; rejectOnEmpty?: false }
  ): Promise<(Assistant & { project: { id: string } }) | null>;
}

export type Options = {
  assistant: Assistant & { project: { id: string } };
  input: ChatCompletionInput;
};

export type ImageOptions = {
  assistant: Assistant;
  input: ImageGenerationInput;
};

export type ModelInfo = {
  model: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
};

export interface CallAI {
  (options: Options): Promise<ReadableStream<ChatCompletionResponse>>;
}

export interface CallAIImage {
  (options: ImageOptions): Promise<{ data: { url: string }[] }>;
}

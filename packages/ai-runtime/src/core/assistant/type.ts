import { ReadableStream } from 'stream/web';

import { ChatCompletionChunk, ChatCompletionInput } from '@blocklet/ai-kit/api/types/chat';
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
  (assistantId: string, options: { projectId?: string; rejectOnEmpty: true | Error }): Promise<Assistant>;
  (assistantId: string, options?: { projectId?: string; rejectOnEmpty?: false }): Promise<Assistant | null>;
}

export type Options = {
  assistant: Assistant;
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
  (options: Options & { outputModel: true }): Promise<{
    modelInfo: ModelInfo;
    chatCompletionChunk: ReadableStream<ChatCompletionChunk>;
  }>;
  (options: Options & { outputModel?: false }): Promise<ReadableStream<ChatCompletionChunk>>;
  (options: Options & { outputModel: boolean }): any;
}

export interface CallAIImage {
  (
    options: ImageOptions & { outputModel: true }
  ): Promise<{ modelInfo: ModelInfo; imageRes: { data: { url: string }[] } }>;
  (options: ImageOptions & { outputModel?: false }): Promise<{ data: { url: string }[] }>;
}

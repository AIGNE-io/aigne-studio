import { ChatCompletionChunk } from '@blocklet/ai-kit/api/types/chat';
import { merge } from 'lodash';

export function toolCallsTransform(
  calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']>,
  chunk: ChatCompletionChunk
) {
  const { toolCalls } = chunk.delta;
  return merge(calls, toolCalls);
}

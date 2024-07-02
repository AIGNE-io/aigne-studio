import { ChatCompletionChunk } from '@blocklet/ai-kit/api/types/chat';

export function toolCallsTransform(
  calls: NonNullable<ChatCompletionChunk['delta']['toolCalls']> | undefined,
  chunk: ChatCompletionChunk
): NonNullable<ChatCompletionChunk['delta']['toolCalls']> {
  const { toolCalls } = chunk.delta;
  const callsCopy: NonNullable<ChatCompletionChunk['delta']['toolCalls']> = calls ?? [];

  toolCalls?.forEach((item) => {
    const targetCall = item?.id ? callsCopy.find((call) => call.id === item?.id) : undefined;
    // 如果 item 有 id, 且 calls 中没有这个 id, 则直接 push
    if (item?.id && !targetCall) {
      callsCopy.push(item);
    } else if (targetCall?.function) {
      targetCall.function.name += item.function?.name || '';
      targetCall.function.arguments = (targetCall.function.arguments || '') + (item.function?.arguments || '');
    }
  });

  return callsCopy;
}

import { LLMModelInputMessage } from '../llm-model';

export function mergeHistoryMessages(
  messages: LLMModelInputMessage[],
  history: LLMModelInputMessage[]
): LLMModelInputMessage[] {
  const firstUserMessageIndex = messages.findIndex((m) => m.role === 'user');
  if (firstUserMessageIndex >= 0) {
    return [...messages.slice(0, firstUserMessageIndex), ...history, ...messages.slice(firstUserMessageIndex)];
  }

  return [...history, ...messages];
}

import { AssistantYjs, ImageAssistantYjs, PromptAssistantYjs, RouterAssistantYjs } from '@blocklet/ai-runtime/types';

import { ModelType } from './types';

export const isModelType = {
  llm: (agent: AssistantYjs): agent is PromptAssistantYjs | RouterAssistantYjs =>
    agent.type === 'prompt' || agent.type === 'router',
  aigc: (agent: AssistantYjs): agent is ImageAssistantYjs => agent.type === 'image',
};

export function resolveModelType(agent: AssistantYjs): ModelType | null {
  if (isModelType.llm(agent)) return 'llm';
  if (isModelType.aigc(agent)) return 'aigc';
  return null;
}

export function sortModels<T extends { model: string }>(
  starredModels: string[],
  recentModels: string[],
  allModels: T[]
): T[] {
  const weights = new Map<string, number>();
  [...recentModels, ...starredModels].forEach((model, index) => {
    weights.set(model, index + 1);
  });
  return [...allModels].sort((a, b) => {
    return (weights.get(b.model) ?? 0) - (weights.get(a.model) ?? 0);
  });
}

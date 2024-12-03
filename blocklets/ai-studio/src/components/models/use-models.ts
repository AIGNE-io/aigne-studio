import {
  defaultImageModel,
  defaultTextModel,
  getModelBrand,
  getSupportedImagesModels,
  getSupportedModels,
} from '@blocklet/ai-runtime/common';
import { AssistantYjs, isImageAssistant, isPromptAssistant, isRouterAssistant } from '@blocklet/ai-runtime/types';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';

import { useProjectStore } from '../../pages/project/yjs-state';
import { ModelInfo, ModelType } from './types';

export function useSupportedModels(): Record<ModelType, ModelInfo[]> {
  async function getAllModels() {
    const [llm, aigc] = await Promise.all([getSupportedModels(), getSupportedImagesModels()]);
    return { llm, aigc };
  }
  const { data } = useRequest(getAllModels);
  return data || { llm: [], aigc: [] };
}

export function useAgentDefaultModel({
  projectId,
  gitRef,
  value,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
}) {
  const { projectSetting } = useProjectStore(projectId, gitRef);
  const defaultModel = useMemo(() => {
    if (isPromptAssistant(value) || isRouterAssistant(value)) {
      return value?.model || projectSetting?.model || defaultTextModel;
    }

    if (isImageAssistant(value)) {
      return value?.model || defaultImageModel;
    }

    return defaultTextModel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(value as any).model, projectSetting?.model]);
  return defaultModel;
}

export function useModelBrand(model: string) {
  const { data } = useRequest(() => getModelBrand(model), {
    refreshDeps: [model],
  });
  return data;
}

// export function useRecommendedModels() {
//   const { data } = useRequest(() => getRecommendedModels(), {
//     refreshDeps: [],
//   });
//   return data;
// }

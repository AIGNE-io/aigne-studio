import {
  defaultImageModel,
  defaultTextModel,
  getModelBrand,
  getSupportedImagesModels,
  getSupportedModels,
} from '@blocklet/ai-runtime/common';
import {
  AssistantYjs,
  ModelInfoBase,
  ResourceType,
  SelectParameter,
  isImageAssistant,
  isPromptAssistant,
  isRouterAssistant,
} from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';

import { useProjectStore } from '../../pages/project/yjs-state';
import { useAgentSelectOptions } from '../agent-select/use-agents';
import { ModelType } from './types';

export function useSupportedModels(): Record<ModelType, ModelInfoBase[]> {
  async function getAllModels() {
    const [llm, aigc] = await Promise.all([getSupportedModels(), getSupportedImagesModels()]);
    return { llm, aigc };
  }
  const { data } = useRequest(getAllModels);
  return data || { llm: [], aigc: [] };
}

export function useModelsFromAgents(type: ModelType) {
  const adapterTypes = { llm: 'llm-adapter', aigc: 'aigc-adapter' };
  const { agents } = useAgentSelectOptions({ type: adapterTypes[type] as ResourceType });
  const models = agents.flatMap((agent) =>
    (agent.parameters?.find((x) => x.key === 'model') as SelectParameter).options?.map((x) => ({
      name: x.label || x.value,
      model: x.value || x.label,
    }))
  );
  return models.filter(isNonNullable);
}

// 内置 model + agents models, 根据 model 标识去重, 内置 model 优先
export function useAllModels(type: ModelType) {
  const builtInModels = useSupportedModels()[type];
  const modelsFromAgents = useModelsFromAgents(type);
  const uniqueModelSet = new Set(builtInModels.map((x) => x.model));

  return [
    ...builtInModels,
    ...modelsFromAgents.filter((x) => {
      if (!uniqueModelSet.has(x.model)) {
        uniqueModelSet.add(x.model);
        return true;
      }
      return false;
    }),
  ];
}

export function useAllSortedModels(type: ModelType) {
  const models = useAllModels(type);
  return models.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

// 获取所有内置模型的品牌信息, 并将其用作 tags (用于筛选模型)
export function useBrandTags() {
  const groupedModels = useSupportedModels();
  const tags = Object.values(groupedModels).flatMap((x) => x.map((y) => y.brand));
  return Array.from(new Set(tags));
}

// 获取项目推荐模型
// export function useProjectRecommendedModels() {
//   const { data } = useRequest(() => getRecommendedModels(), {
//     refreshDeps: [],
//   });
//   return data;
// }

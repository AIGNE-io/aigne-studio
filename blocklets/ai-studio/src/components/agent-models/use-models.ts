import {
  defaultImageModel,
  defaultTextModel,
  getModelBrand,
  getSupportedImagesModels,
  getSupportedModels,
} from '@blocklet/ai-runtime/common';
import {
  AssistantYjs,
  ImageModelInfo,
  ResourceType,
  SelectParameter,
  isImageAssistant,
  isPromptAssistant,
  isRouterAssistant,
} from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';

import { useCurrentProject } from '../../contexts/project';
import { useProjectStore } from '../../pages/project/yjs-state';
import { useAgentSelectOptions } from '../agent-select/use-agents';
import { AgentModel, ModelType } from './types';
import { sortModels } from './utils';

export function useSupportedModels(): Record<ModelType, (ImageModelInfo | ImageModelInfo)[]> {
  async function getAllModels() {
    const [llm, aigc] = await Promise.all([getSupportedModels(), getSupportedImagesModels()]);
    return { llm, aigc };
  }
  const { data } = useRequest(getAllModels);
  return data || { llm: [], aigc: [] };
}

export function useModelsFromAgents(type: ModelType): AgentModel[] {
  const adapterTypes = { llm: 'llm-adapter', aigc: 'aigc-adapter' };
  const { agents } = useAgentSelectOptions({ type: adapterTypes[type] as ResourceType });

  // TODO: project icon link 不可用
  // const projectIcons = new Map<string, string>(
  //   agents.map((agent) => [
  //     agent.identity.projectId,
  //     getProjectIconUrl(agent.identity.projectId, {
  //       blockletDid: agent.identity.blockletDid,
  //     }),
  //   ])
  // );

  const models = agents.flatMap((agent) =>
    (agent.parameters?.find((x) => x.key === 'model') as SelectParameter)?.options?.map((x) => ({
      name: x.label || x.value,
      model: x.value || x.label,
    }))
  );
  return models.filter(isNonNullable);
}

// 内置 model + agents models, 根据 model 标识去重, 内置 model 优先
export function useAllModels(type: ModelType): AgentModel[] {
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

export function useSuggestedModels({
  type,
  pinnedModels = [],
  limit = 8,
}: {
  type: ModelType;
  pinnedModels?: string[]; // 使用场景: 避免 suggested models 中未包含 agent default model
  limit?: number;
}) {
  const allModels = useAllModels(type);
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const sorted = sortModels(
    [...(projectSetting.starredModels ?? []), ...pinnedModels],
    projectSetting.recentModels ?? [],
    allModels
  );
  return sorted.slice(0, limit);
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

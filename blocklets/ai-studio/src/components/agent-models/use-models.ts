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
  TextModelInfo,
  isImageAssistant,
  isPromptAssistant,
  isRouterAssistant,
} from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';

import { useCurrentProject } from '../../contexts/project';
import { getProjectIconUrl } from '../../libs/project';
import { useProjectStore } from '../../pages/project/yjs-state';
import { useAgentSelectOptions } from '../agent-select/use-agents';
import { ModelType } from './types';
import { sortModels } from './utils';

function useSupportedModels(type: ModelType): (TextModelInfo | ImageModelInfo)[] {
  async function getModels() {
    if (type === 'llm') {
      return await getSupportedModels();
    }
    return await getSupportedImagesModels();
  }
  const { data } = useRequest(getModels, { refreshDeps: [type] });
  return data || [];
}

function useIsBuiltinModel(model: string, type: ModelType) {
  const supportedModels = useSupportedModels(type);
  return supportedModels.some((x) => x.model === model);
}

function useAgents({ type }: { type: ModelType }) {
  const adapterTypes = { llm: 'llm-adapter', aigc: 'aigc-adapter' };
  const { agents } = useAgentSelectOptions({ type: adapterTypes[type] as ResourceType });
  return agents;
}

export function useModelsFromAgents(type: ModelType): (TextModelInfo | ImageModelInfo)[] {
  const agents = useAgents({ type });
  const projectIcons = new Map<string, string>(
    agents.map((agent) => [
      agent.identity.projectId,
      getProjectIconUrl(agent.project.id, {
        blockletDid: agent.identity.blockletDid,
        projectRef: agent.identity.projectRef,
        updatedAt: agent.project.updatedAt,
      }),
    ])
  );

  const models = agents.flatMap((agent) =>
    (agent.parameters?.find((x) => x.key === 'model') as SelectParameter)?.options?.map((x) => ({
      name: x.label || x.value,
      model: x.value || x.label,
      icon: projectIcons.get(agent.project.id),
      brand: agent.name || '',
      tags: agent.tags,
    }))
  );
  return models.filter(isNonNullable);
}

// 内置 model + agents models, 根据 model 标识去重, 内置 model 优先
export function useAllModels(type: ModelType): (TextModelInfo | ImageModelInfo)[] {
  const builtInModels = useSupportedModels(type);
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
  requiredModel,
  limit = 8,
}: {
  type: ModelType;
  requiredModel?: string; // 必备 model, 避免 suggested models 中未包含 agent current model
  limit?: number;
}) {
  const allModels = useAllModels(type);
  const modelSet = new Set(allModels.map((x) => x.model));
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const sorted = sortModels(
    (projectSetting.starredModels ?? []).filter((x) => modelSet.has(x)),
    (projectSetting.recentModels ?? []).filter((x) => modelSet.has(x)),
    allModels
  );
  const result = sorted.slice(0, limit);
  if (requiredModel && modelSet.has(requiredModel) && !result.some((x) => x.model === requiredModel)) {
    result.push(allModels.find((x) => x.model === requiredModel)!);
  }
  return result;
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

export function useModelAdapterAgent(model: string, type: ModelType) {
  const isBuiltin = useIsBuiltinModel(model, type);
  const agents = useAgents({ type });
  if (isBuiltin) return null;
  const agent = agents.find((agent) =>
    (agent.parameters?.find((x) => x.key === 'model') as SelectParameter)?.options?.some(
      (x) => x.value === model || x.label === model
    )
  );
  return agent;
}

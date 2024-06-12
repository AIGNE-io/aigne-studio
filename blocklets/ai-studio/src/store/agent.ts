import { ResourceType } from '@api/libs/resource';
import { Agent, getAgents } from '@app/libs/agent';
import { useCurrentProjectState } from '@app/pages/project/state';
import { useAssistants, useProject } from '@app/pages/project/yjs-state';
import {
  Assistant,
  arrayFromYjs,
  fileFromYjs,
  isAssistant,
  outputVariableFromYjs,
  parameterFromYjs,
} from '@blocklet/ai-runtime/types';
import { groupBy, pick } from 'lodash';
import { useEffect } from 'react';
import { StoreApi, UseBoundStore, create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ResourceAgentsState {
  loading?: boolean;
  loaded?: boolean;
  agents?: Agent[];
  error?: Error;
  load: () => Promise<void>;
}

const CACHE: { [type in ResourceType]?: UseBoundStore<StoreApi<ResourceAgentsState>> } = {};

const resourceAgentsState = ({ type }: { type: ResourceType }) => {
  CACHE[type] ??= create<ResourceAgentsState>()(
    immer((set) => ({
      load: async () => {
        set((state) => {
          state.loading = true;
        });
        try {
          const { agents } = await getAgents({ type });
          set((state) => {
            state.agents = agents;
          });
        } catch (error) {
          set((state) => {
            state.error = error;
          });
          throw error;
        } finally {
          set((state) => {
            state.loading = true;
            state.loaded = true;
          });
        }
      },
    }))
  );

  return CACHE[type]!;
};

export function useResourceAgents({ type }: { type: ResourceType }) {
  const state = resourceAgentsState({ type })();

  useEffect(() => {
    if (!state.loading && !state.loaded) state.load();
  }, []);

  return state;
}

export type UseAgentItem = Omit<Agent, 'blocklet'> & Partial<Pick<Agent, 'blocklet'>>;

export function useAgents({ type }: { type: ResourceType }) {
  const { agents = [], load } = useResourceAgents({ type });
  const {
    state: { project },
  } = useCurrentProjectState();
  const assistants = useAssistants();

  const localAgents = !project
    ? []
    : assistants.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        type: i.type,
        get parameters() {
          return i.parameters && arrayFromYjs(i.parameters, parameterFromYjs);
        },
        get outputVariables() {
          return i.outputVariables && arrayFromYjs(i.outputVariables, outputVariableFromYjs);
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: String(project.createdAt),
          updatedAt: String(project.updatedAt),
          createdBy: project.createdBy,
        },
        blocklet: undefined,
      }));

  const resourceAgents = agents.filter((i) => i.project.id !== project?.id);

  const allAgents: UseAgentItem[] = [...localAgents, ...resourceAgents];
  const allAgentMap = Object.fromEntries(allAgents.map((i) => [i.id, i]));

  const allProjects = Object.values(groupBy(allAgents, (i) => i.project.id)).map((i) => i[0]!.project);
  const allProjectMap = Object.fromEntries(allProjects.map((i) => [i.id, i]));

  return { load, agents: allAgents, agentMap: allAgentMap, project: allProjects, projectMap: allProjectMap };
}

export function useAgent({
  projectId,
  agentId,
  type,
}: {
  projectId?: string;
  agentId: string;
  type: ResourceType;
}): (Omit<Agent, 'blocklet'> & { blocklet?: Agent['blocklet'] }) | undefined {
  const {
    state: { project },
  } = useCurrentProjectState();
  const { store } = useProject();
  const { agents = [] } = useResourceAgents({ type });

  if (!project) return undefined;

  if (!projectId || projectId === project?.id) {
    const file = store.files[agentId];
    if (file && isAssistant(file)) {
      return {
        ...(fileFromYjs(file) as Assistant),
        project: {
          id: project.id,
          createdAt: String(project.createdAt),
          updatedAt: String(project.updatedAt),
          ...pick(project, 'name', 'description', 'createdBy'),
        },
      };
    }
    return undefined;
  }

  return agents.find((i) => i.id === agentId && i.project.id === projectId);
}

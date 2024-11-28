import { useCurrentProject } from '@app/contexts/project';
import { useCurrentProjectState } from '@app/pages/project/state';
import { useAssistants, useProject } from '@app/pages/project/yjs-state';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import {
  Assistant,
  ResourceType,
  arrayFromYjs,
  fileFromYjs,
  isAssistant,
  outputVariableFromYjs,
  parameterFromYjs,
} from '@blocklet/ai-runtime/types';
import { Agent, getAgents } from '@blocklet/aigne-sdk/api/agent';
import { groupBy, pick } from 'lodash';
import { useEffect } from 'react';
import { StoreApi, UseBoundStore, create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ResourceAgentsState {
  loading?: boolean;
  loaded?: boolean;
  agents?: (Agent & {
    identity: Agent['identity'] & {
      projectId: string;
      projectRef?: string;
      blockletDid?: string;
      agentId: string;
    };
  })[];
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
            state.agents = agents.map((i) => ({
              ...i,
              identity: {
                ...parseIdentity(i.identity.aid, { rejectWhenError: true }),
                ...i.identity,
              },
            }));
          });
        } catch (error) {
          set((state) => {
            state.error = error;
          });
          throw error;
        } finally {
          set((state) => {
            state.loading = false;
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

export type UseAgentItem = Omit<Agent, 'identity'> & {
  identity: Omit<Agent['identity'], 'aid'> & {
    projectId: string;
    projectRef?: string;
    blockletDid?: string;
    agentId: string;
  };
};

export function useAgents({ type }: { type: ResourceType }) {
  const { agents = [], load, loading } = useResourceAgents({ type });
  const { projectId, projectRef } = useCurrentProject();
  const {
    state: { project },
  } = useCurrentProjectState();
  const assistants = useAssistants();

  const localAgents: UseAgentItem[] = !project
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
        identity: {
          projectId,
          projectRef,
          agentId: i.id,
          working: true,
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          createdAt: String(project.createdAt),
          updatedAt: String(project.updatedAt),
          createdBy: project.createdBy,
          createdByInfo: project.createdByInfo,
        },
      }));

  const resourceAgents = agents.filter((i) => i.project.id !== project?.id);

  const allAgents: UseAgentItem[] = [...localAgents, ...resourceAgents];
  const allAgentMap = Object.fromEntries(allAgents.map((i) => [i.id, i]));

  const allProjects = Object.values(groupBy(allAgents, (i) => i.project.id)).map((i) => ({
    ...i[0]!.project,
    blockletDid: i[0]!.identity.blockletDid,
  }));
  const allProjectMap = Object.fromEntries(allProjects.map((i) => [i.id, i]));

  return {
    load,
    loading,
    agents: allAgents,
    localAgents,
    resourceAgents,
    agentMap: allAgentMap,
    project: allProjects,
    projectMap: allProjectMap,
  };
}

export function useAgent({
  blockletDid,
  projectId,
  agentId,
  type,
}: {
  blockletDid?: string;
  projectId?: string;
  agentId: string;
  type: ResourceType;
}): UseAgentItem | undefined {
  const {
    state: { project },
  } = useCurrentProjectState();
  const { store } = useProject();
  const { projectRef } = useCurrentProject();
  const { agents = [] } = useResourceAgents({ type });

  if (blockletDid) {
    return agents.find((i) => i.id === agentId && i.project.id === projectId && i.identity.blockletDid === blockletDid);
  }

  if (!project) return undefined;

  if (!projectId || projectId === project?.id) {
    const file = store.files[agentId];
    if (file && isAssistant(file)) {
      return {
        ...(fileFromYjs(file) as Assistant),
        identity: {
          projectId: project.id,
          projectRef,
          agentId: file.id,
          working: true,
        },
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

  return undefined;
}

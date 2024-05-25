import { Agent, getAgents } from '@app/libs/agent';
import { useCurrentProjectState } from '@app/pages/project/state';
import { useAssistants, useProject } from '@app/pages/project/yjs-state';
import { Assistant, fileFromYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { groupBy, pick } from 'lodash';
import { useEffect } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface ResourceAgentsState {
  loading?: boolean;
  loaded?: boolean;
  agents?: Agent[];
  error?: Error;
  load: () => Promise<void>;
}

const resourceAgentsState = create<ResourceAgentsState>()(
  immer((set) => ({
    load: async () => {
      set((state) => {
        state.loading = true;
      });
      try {
        const { agents } = await getAgents({ type: 'tool' });
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

export function useResourceAgents() {
  const state = resourceAgentsState();

  useEffect(() => {
    if (!state.loading && !state.loaded) state.load();
  }, []);

  return state;
}

export function useAgents() {
  const { agents = [], load } = useResourceAgents();
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
        project: {
          id: project._id,
          name: project.name,
          description: project.description,
          updatedAt: String(project.updatedAt),
          createdBy: project.createdBy,
        },
        blocklet: undefined,
      }));

  const resourceAgents = agents
    .filter((i) => i.project.id !== project?._id)
    .map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      type: i.type,
      project: {
        id: i.project.id,
        name: i.project.name,
        description: i.project.description,
        updatedAt: i.project.updatedAt,
        createdBy: i.project.createdBy,
      },
      blocklet: {
        did: i.blocklet.did,
      },
    }));

  const allAgents = [...localAgents, ...resourceAgents];
  const allAgentMap = Object.fromEntries(allAgents.map((i) => [i.id, i]));

  const allProjects = Object.values(groupBy(allAgents, (i) => i.project.id)).map((i) => i[0]!.project);
  const allProjectMap = Object.fromEntries(allProjects.map((i) => [i.id, i]));

  return { load, agents: allAgents, agentMap: allAgentMap, project: allProjects, projectMap: allProjectMap };
}

export function useAgent({
  projectId,
  agentId,
}: {
  projectId?: string;
  agentId: string;
}): (Omit<Agent, 'blocklet'> & { blocklet?: Agent['blocklet'] }) | undefined {
  const {
    state: { project },
  } = useCurrentProjectState();
  const { store } = useProject();
  const { agents = [] } = useResourceAgents();

  if (!project) return undefined;

  if (projectId === project?._id) {
    const file = store.files[agentId];
    if (file && isAssistant(file)) {
      return {
        ...(fileFromYjs(file) as Assistant),
        project: {
          id: project._id,
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

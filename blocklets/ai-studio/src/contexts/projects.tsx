import { useCallback } from 'react';
import { atom, useRecoilState } from 'recoil';

import { Project } from '../../api/src/store/projects';
import * as api from '../libs/project';

export interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error?: Error;
}

const projectsState = atom<ProjectsState>({
  key: 'projectsState',
  default: {
    projects: [],
    loading: false,
  },
});

export const useProjectsState = () => {
  const [state, setState] = useRecoilState(projectsState);

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const { projects } = await api.getProjects();
      setState((v) => ({ ...v, projects, error: undefined }));
      return { projects };
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [setState]);

  const createProject: typeof api.createProject = useCallback(
    async (...args) => {
      const res = await api.createProject(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  const updateProject: typeof api.updateProject = useCallback(
    async (...args) => {
      const res = await api.updateProject(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  const deleteProject: typeof api.deleteProject = useCallback(
    async (...args) => {
      const res = await api.deleteProject(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  return { state, refetch, createProject, updateProject, deleteProject };
};

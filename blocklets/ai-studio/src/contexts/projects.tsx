import { useCallback } from 'react';
import { atom, useRecoilState } from 'recoil';

import { Project } from '../../api/src/store/projects';
import * as api from '../libs/project';

export type ProjectsSection = 'templates' | 'projects' | 'samples';

export interface ProjectsState {
  templates: api.ProjectTemplate[];
  projects: Project[];
  loading: boolean;
  error?: Error;
  selected?: { section: 'templates'; item: api.ProjectTemplate } | { section: 'projects'; item: Project };
  menuAnchor?: ProjectsState['selected'] & { anchor: HTMLElement };
}

const projectsState = atom<ProjectsState>({
  key: 'projectsState',
  default: {
    templates: [],
    projects: [],
    loading: false,
  },
});

export const useProjectsState = () => {
  const [state, setState] = useRecoilState(projectsState);

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const [{ templates }, { projects }] = await Promise.all([api.getProjectTemplates(), api.getProjects()]);
      setState((v) => ({ ...v, templates, projects, error: undefined }));
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

  const setSelected = useCallback(
    (selected: ProjectsState['selected']) => {
      setState((v) => ({ ...v, selected }));
    },
    [setState]
  );

  const setMenuAnchor = useCallback(
    (menuAnchor: ProjectsState['menuAnchor']) => {
      setState((v) => ({ ...v, menuAnchor }));
    },
    [setState]
  );

  return { state, refetch, createProject, updateProject, deleteProject, setSelected, setMenuAnchor };
};

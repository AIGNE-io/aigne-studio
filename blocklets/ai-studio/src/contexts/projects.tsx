import { showPlanUpgrade } from '@app/components/multi-tenant-restriction';
import { useCurrentGitStore } from '@app/store/current-git-store';
import { RuntimeError, RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import { Quotas } from '@blocklet/aigne-sdk/quotas';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { atom, useRecoilState } from 'recoil';

import * as api from '../libs/project';
import { useIsPromptAdmin, useSessionContext } from './session';

export type ProjectsSection = 'templates' | 'projects' | 'examples';

export interface ProjectsState {
  templates: api.ProjectWithUserInfo[];
  projects: api.ProjectWithUserInfo[];
  examples: api.ProjectWithUserInfo[];
  loading: boolean;
  error?: Error;
  selected?: { section: ProjectsSection; id: string; blockletDid?: string };
  menuAnchor?: ProjectsState['selected'] & { anchor: HTMLElement };
}

const projectsState = atom<ProjectsState>({
  key: 'projectsState',
  default: {
    templates: [],
    projects: [],
    examples: [],
    loading: false,
  },
});

const quotas = new Quotas(window.blocklet?.preferences);

export const useProjectsState = () => {
  const [state, setState] = useRecoilState(projectsState);
  const { session } = useSessionContext();
  const setProjectGitSettings = useCurrentGitStore((i) => i.setProjectGitSettings);
  const isPromptAdmin = useIsPromptAdmin();

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const { templates, projects, examples } = await api.getProjects();
      setProjectGitSettings(projects);
      setState((v) => ({ ...v, templates, projects, examples, error: undefined }));
      return { projects, templates, examples };
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [setProjectGitSettings, setState]);

  const createProject: typeof api.createProject = useCallback(
    async (...args) => {
      const res = await api.createProject(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  const importProject: typeof api.projectImport = useCallback(
    async (...args) => {
      const res = await api.projectImport(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  const fromDidSpacesImport: typeof api.fromDidSpacesImport = useCallback(
    async (...args) => {
      const res = await api.fromDidSpacesImport(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  const updateProject: typeof api.updateProject = useCallback(
    async (...args) => {
      const res = await api.updateProject(...args);
      refetch();
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

  const listProjectsByDidSpaces: typeof api.listProjectsByDidSpaces = useCallback(
    async (...args) => {
      const res = await api.listProjectsByDidSpaces(...args);
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

  const createLimitDialog = () => {
    showPlanUpgrade('projectLimit');
  };

  const checkProjectLimit = () => {
    if (window.blocklet?.tenantMode === 'multiple') {
      // check project count limit
      const count = state.projects.length;
      const passports = session?.user?.passports?.map((x: any) => x.name);
      if (!quotas.checkProjectLimit(count + 1, passports) && !isPromptAdmin) {
        createLimitDialog();
        throw new RuntimeError(
          RuntimeErrorType.ProjectLimitExceededError,
          `Project limit exceeded (current: ${count}, limit: ${quotas.getQuota('projectLimit', passports)}) `
        );
      }
    }
  };

  const clearState = () => {
    setState({
      templates: [],
      projects: [],
      examples: [],
      loading: false,
    });
  };

  useEffect(() => {
    if (!session.user?.did) {
      clearState();
    }
  }, [session.user?.did]);

  return {
    state,
    refetch,
    createProject,
    importProject,
    fromDidSpacesImport,
    updateProject,
    deleteProject,
    listProjectsByDidSpaces,
    setSelected,
    setMenuAnchor,
    checkProjectLimit,
    clearState,
    createLimitDialog,
  };
};

export const useProjectLimiting = () => {
  const { session } = useSessionContext();
  const sessionRef = useRef(session);
  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const isPromptAdmin = useIsPromptAdmin();
  const checkProjectLimitAsync = async () => {
    if (!sessionRef.current?.user?.did) {
      return false;
    }
    if (window.blocklet?.tenantMode !== 'multiple' || isPromptAdmin) {
      return true;
    }
    const count = await api.countProjects();
    const passports = sessionRef.current?.user?.passports?.map((x: any) => x.name);
    if (!quotas.checkProjectLimit(count + 1, passports)) {
      showPlanUpgrade('projectLimit');
      return false;
    }
    return true;
  };

  return { checkProjectLimitAsync };
};

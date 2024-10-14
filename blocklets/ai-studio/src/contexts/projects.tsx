import { useCurrentGitStore } from '@app/store/current-git-store';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box } from '@mui/material';
import { useCallback, useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';

import * as api from '../libs/project';
import { useIsPromptAdmin, useSessionContext } from './session';

export type ProjectsSection = 'templates' | 'projects' | 'examples';

const AI_STUDIO_STORE = 'https://registry.arcblock.io/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

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

export const useProjectsState = () => {
  const [state, setState] = useRecoilState(projectsState);
  const { session } = useSessionContext();
  const setProjectGitSettings = useCurrentGitStore((i) => i.setProjectGitSettings);
  const isPromptAdmin = useIsPromptAdmin();
  const { dialog, showDialog } = useDialog();

  const { t } = useLocaleContext();
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
    showDialog({
      formSx: {
        '.MuiDialogTitle-root': {
          border: 0,
        },
        '.MuiDialogActions-root': {
          border: 0,
        },
      },
      disableEnforceFocus: true,
      fullWidth: true,
      maxWidth: 'sm',
      title: t('launchMore'),
      content: (
        <Box sx={{ whiteSpace: 'break-spaces' }} data-testid="launchMoreContent">
          {t('launchMoreContent', { length: window.blocklet?.preferences?.multiTenantProjectLimits })}
        </Box>
      ),
      cancelText: t('cancel'),
      okText: t('launchMoreConfirm'),
      onOk: () => window.open(AI_STUDIO_STORE, '_blank'),
    });
  };

  const checkProjectLimit = () => {
    if (window.blocklet?.tenantMode === 'multiple') {
      // check project count limit
      const count = state.projects.length;
      const currentLimit = window.blocklet?.preferences?.multiTenantProjectLimits;
      if (count >= currentLimit && !isPromptAdmin) {
        createLimitDialog();
        throw new Error(`Project limit exceeded (current: ${count}, limit: ${currentLimit}) `);
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
    limitDialog: dialog,
  };
};

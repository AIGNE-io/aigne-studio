import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import orderBy from 'lodash/orderBy';
import { useCallback, useEffect, useState } from 'react';

import type { EntryWithMeta } from '../../../../api/src/routes/tree';
import type Project from '../../../../api/src/store/models/project';
import { getErrorMessage } from '../../../libs/api';
import { getBranches } from '../../../libs/branch';
import { getProjects } from '../../../libs/project';
import * as api from '../../../libs/tree';
import { PROMPTS_FOLDER_NAME } from '../yjs-state';

type State = {
  loading: boolean;
  error?: string;
  projectId: string;
  ref: string;
  branches: string[];
  files: EntryWithMeta[];
  projects: Project[];
  templates: any[];
  templateProjectId: string;
  templateRef: string;
};

const useRequest = (currentProjectId: string, currentGitRef: string) => {
  const { t } = useLocaleContext();

  const [state, setState] = useState<State>({
    loading: true,
    projectId: '',
    ref: 'main',
    branches: [],
    files: [],
    projects: [],
    templates: [],
    templateProjectId: '',
    templateRef: '',
  });

  const refetch = useCallback(
    async ({ projectId, ref }: { projectId: string; ref: string }) => {
      setState((v) => ({ ...v, loading: true }));
      try {
        const { branches } = await getBranches({ projectId });
        const branch = branches.includes(ref) ? ref : 'main';
        const { files } = await api.getTree({ projectId, ref: branch });

        const disabledProject = currentProjectId === projectId && currentGitRef === ref;

        setState((v) => ({
          ...v,
          projectId,
          ref: branch,
          files: disabledProject
            ? []
            : files.filter((x) => typeof x === 'object' && x.parent[0] === PROMPTS_FOLDER_NAME),
          branches,
          error: undefined,
        }));
        return { files };
      } catch (error) {
        setState((v) => ({ ...v, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, loading: false }));
      }
    },
    [setState]
  );

  const projectFn = useCallback(async () => {
    const [{ projects }] = await Promise.all([getProjects()]);
    const filterProjects = orderBy(projects || [], ['updatedAt'], ['desc']);
    setState((v) => ({ ...v, projects: filterProjects, error: undefined }));
    return filterProjects;
  }, [setState]);

  const init = async () => {
    try {
      const projects = await projectFn();

      if (projects.length) {
        await refetch({ projectId: projects[0]?.id || '', ref: 'main' });
        return;
      }

      setState((v) => ({ ...v, loading: false }));
      Toast.warning(t('import.empty'));
    } catch (error) {
      setState((v) => ({ ...v, loading: false }));
      Toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, currentGitRef]);

  return [state, setState, { init, refetch }] as const;
};

export default useRequest;

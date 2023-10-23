import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect, useState } from 'react';

import { EntryWithMeta } from '../../../../api/src/routes/tree';
import { Project } from '../../../../api/src/store/projects';
import { getErrorMessage } from '../../../libs/api';
import { getBranches } from '../../../libs/branch';
import { getProjects } from '../../../libs/project';
import * as api from '../../../libs/tree';

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

const useRequest = (projectId: string): [State, any, any] => {
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
        const [{ files }, { branches }] = await Promise.all([
          api.getTree({ projectId, ref }),
          getBranches({ projectId }),
        ]);

        setState((v) => ({
          ...v,
          projectId,
          ref,
          files: files.filter((x) => typeof x === 'object'),
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
    setState((v) => ({ ...v, projects, error: undefined }));
    return projects;
  }, [setState]);

  const init = async () => {
    try {
      const projects = (await projectFn()).filter((x) => x._id !== projectId);
      await refetch({ projectId: projects[0]?._id || '', ref: 'main' });
    } catch (error) {
      setState((v) => ({ ...v, loading: false }));
      Toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return [state, setState, { init, refetch }];
};

export default useRequest;

import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EntryWithMeta } from '../../../api/src/routes/tree';
import { Project } from '../../../api/src/store/projects';
import { getErrorMessage } from '../../libs/api';
import { getBranches } from '../../libs/branche';
import { getExportTemplates } from '../../libs/export';
import { getProjects } from '../../libs/project';
import * as api from '../../libs/tree';

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

type UseRequest = (data: { projectId: string; releaseId: string }) => [State, any, any];

const useRequest: UseRequest = ({ projectId, releaseId }) => {
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
        setState((v) => ({ ...v, projectId, ref, files, branches, error: undefined }));
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
      const result: any = await getExportTemplates({ projectId, releaseId });

      if (result?.templates?.length > 0) {
        setState((v) => ({
          ...v,
          templates: result.templates,
          templateProjectId: result.projectId,
          templateRef: result.ref,
        }));

        await Promise.all([projectFn(), refetch(result.templates[0])]);
      } else {
        const projects = await projectFn();
        await refetch({ projectId: projects[0]?._id || '', ref: 'main' });
      }
    } catch (error) {
      setState((v) => ({ ...v, loading: false }));
      Toast.error(getErrorMessage(error));
    }
  };

  const isSameProject = useMemo(() => {
    return state.projectId === state.templateProjectId && state.ref === state.templateRef;
  }, [state]);

  const derived = useMemo(() => {
    return state.templates.map((x) => x.id);
  }, [state.templates]);

  const exported = useMemo(() => {
    if (!isSameProject) return {};

    return state.templates.reduce((pre, cur) => {
      const found = state.files.find((f) => f.name === `${cur.id}.yaml`);
      pre[`${cur.id}.yaml`] = Boolean(found);
      return pre;
    }, {});
  }, [isSameProject, state]);

  const removed = useMemo(() => {
    if (!isSameProject) return [];

    const removedTemplates = Object.keys(exported).filter((key: string): boolean => !exported[key]);

    return state.templates.filter((t) => {
      return removedTemplates.includes(`${t.id}.yaml`);
    });
  }, [isSameProject, exported, state.templates]);

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, releaseId]);

  return [state, setState, { init, derived, removed, exported, isSameProject, refetch }];
};

export default useRequest;

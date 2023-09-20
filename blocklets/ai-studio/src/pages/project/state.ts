import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { Project } from '../../../api/src/store/projects';
import { getBranches } from '../../libs/branche';
import * as branchApi from '../../libs/branche';
import { Commit, getLogs } from '../../libs/log';
import { getProject } from '../../libs/project';

export const defaultBranch = 'main';

export interface ProjectState {
  project?: Project;
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

const projectStates: { [key: string]: RecoilState<ProjectState> } = {};

const projectState = (projectId: string, gitRef: string) => {
  const key = `${projectId}-${gitRef}`;

  projectStates[key] ??= atom<ProjectState>({
    key: `projectState-${key}`,
    default: { branches: [], commits: [] },
  });

  return projectStates[key]!;
};

export const useProjectState = (projectId: string, gitRef: string) => {
  const [state, setState] = useRecoilState(projectState(projectId, gitRef));

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const [project, { branches }, { commits }] = await Promise.all([
        getProject(projectId),
        getBranches({ projectId }),
        getLogs({ projectId, ref: gitRef }),
      ]);
      setState((v) => ({ ...v, project, branches, commits, error: undefined }));
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [projectId, gitRef, setState]);

  const createBranch = useCallback(
    async (...args: Parameters<typeof branchApi.createBranch>) => {
      const { branches } = await branchApi.createBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const updateBranch = useCallback(
    async (...args: Parameters<typeof branchApi.updateBranch>) => {
      const { branches } = await branchApi.updateBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const deleteBranch = useCallback(
    async (...args: Parameters<typeof branchApi.deleteBranch>) => {
      const { branches } = await branchApi.deleteBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  return { state, refetch, createBranch, updateBranch, deleteBranch };
};

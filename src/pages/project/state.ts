import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { EntryWithMeta } from '../../../api/src/routes/tree';
import { Project } from '../../../api/src/store/projects';
import { getBranches } from '../../libs/branche';
import * as branchApi from '../../libs/branche';
import { Commit, getLogs } from '../../libs/log';
import { getProject } from '../../libs/project';
import * as api from '../../libs/tree';

export interface ProjectState {
  project?: Project;
  files: EntryWithMeta[];
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

const projectStates: { [key: string]: RecoilState<ProjectState> } = {};

const projectState = (projectId: string) => {
  projectStates[projectId] ??= atom<ProjectState>({
    key: `projectState-${projectId}`,
    default: { files: [], branches: [], commits: [] },
  });

  return projectStates[projectId]!;
};

export const useProjectState = (projectId: string, ref: string) => {
  const [state, setState] = useRecoilState(projectState(projectId));

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const [project, { files }, { branches }, { commits }] = await Promise.all([
        getProject(projectId),
        api.getTree({ projectId, ref }),
        getBranches({ projectId }),
        getLogs({ projectId, ref }),
      ]);
      setState((v) => ({ ...v, project, ref, files, branches, commits, error: undefined }));
      return { files };
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [projectId, ref, setState]);

  const createFile: typeof api.createFile = useCallback(
    async (args) => {
      const res = await api.createFile(args as any);
      await refetch();
      return res as any;
    },
    [refetch]
  );

  const deleteFile = useCallback(
    async (...args: Parameters<typeof api.deleteFile>) => {
      await api.deleteFile(...args);
      await refetch();
    },
    [refetch]
  );

  const moveFile = useCallback(
    async (...args: Parameters<typeof api.moveFile>) => {
      await api.moveFile(...args);
      await refetch();
    },
    [refetch]
  );

  const putFile = useCallback(
    async (...args: Parameters<typeof api.putFile>) => {
      const res = await api.putFile(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

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

  return { state, refetch, createFile, deleteFile, moveFile, putFile, createBranch, updateBranch, deleteBranch };
};

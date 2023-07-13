import { useCallback } from 'react';
import { atom, useRecoilState } from 'recoil';

import { EntryWithMeta } from '../../../api/src/routes/tree';
import { getBranches } from '../../libs/branches';
import * as branchApi from '../../libs/branches';
import { Commit, getLogs } from '../../libs/logs';
import * as api from '../../libs/tree';

export interface ProjectState {
  files: EntryWithMeta[];
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

const projectState = atom<ProjectState>({
  key: 'projectState',
  default: { files: [], branches: [], commits: [] },
});

export const useProjectState = (ref: string) => {
  const [state, setState] = useRecoilState(projectState);

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const [{ files }, { branches }, { commits }] = await Promise.all([
        api.getTree({ ref }),
        getBranches(),
        getLogs({ ref }),
      ]);
      setState((v) => ({ ...v, ref, files, branches, commits, error: undefined }));
      return { files };
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [ref, setState]);

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

  return { state, refetch, createFile, deleteFile, moveFile, putFile, createBranch };
};

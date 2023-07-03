import { useCallback } from 'react';
import { atom, useRecoilState } from 'recoil';

import { Entry } from '../../../api/src/store/time-machine';
import * as api from '../../libs/tree';

export interface ProjectState {
  files: Entry[];
  loading?: boolean;
  error?: Error;
}

const projectState = atom<ProjectState>({
  key: 'projectState',
  default: { files: [] },
});

export const useProjectState = (ref: string) => {
  const [state, setState] = useRecoilState(projectState);

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const { files } = await api.getTree({ ref });
      setState((v) => ({ ...v, ref, files, error: undefined }));
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

  return { state, refetch, createFile, deleteFile, moveFile, putFile };
};

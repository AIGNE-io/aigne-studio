import { useUpdate } from 'ahooks';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import { ReactNode, createContext, useCallback, useContext, useRef } from 'react';

import { Dataset } from '../../api/src/store/0.1.157/datasets';
import { createDataset, getDatasets } from '../libs/dataset';

export interface DatasetsContext {
  datasets: Dataset[];
  loading: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  createDataset: typeof createDataset;
}

const ctx = createContext<DatasetsContext | undefined>(undefined);

export function DatasetsProvider({ children }: { children: ReactNode }) {
  const value = useRef<DatasetsContext>({
    datasets: [],
    loading: false,
    refetch: async () => {
      const state = value.current;
      if (state.loading) {
        return;
      }
      setValue((v) => (v.loading = true));
      try {
        const { datasets } = await getDatasets();

        setValue((v) => {
          v.datasets = datasets;
        });
      } catch (error) {
        setValue((v) => (v.error = error));
        throw error;
      } finally {
        setValue((v) => (v.loading = false));
      }
    },
    createDataset: async (input) => {
      const dataset = await createDataset(input);
      await value.current.refetch();
      return dataset;
    },
  });

  const update = useUpdate();

  const setValue = useCallback(
    (u: (draft: WritableDraft<DatasetsContext>) => void) => {
      value.current = produce(value.current, (draft) => {
        u(draft);
        return draft;
      });
      update();
      return value.current;
    },
    [update]
  );

  return <ctx.Provider value={value.current}>{children}</ctx.Provider>;
}

export function useDatasets() {
  const state = useContext(ctx);
  if (!state) {
    throw new Error('`useDatasets()` is only allowed to be used in a child of `DatasetsProvider`');
  }

  return state;
}

import { useUpdate } from 'ahooks';
import { Draft, produce } from 'immer';
import { ReactNode, createContext, useCallback, useContext, useRef } from 'react';

import Dataset from '../../api/src/store/models/dataset/list';
import { createDataset, createUnit, deleteDataset, getDatasets, getUnits } from '../libs/dataset';

export interface DatasetsContext {
  datasets: Dataset[];
  loading: boolean;
  error?: Error;
  refetch: () => Promise<void>;
  createDataset: typeof createDataset;
  deleteDataset: typeof deleteDataset;
  createUnit: typeof createUnit;
  getUnits: typeof getUnits;
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
    deleteDataset: async (datasetId) => {
      await deleteDataset(datasetId);
      await value.current.refetch();
    },
    createUnit: async (datasetId, input: { type: string; name: string }) => {
      await createUnit(datasetId, input);
    },
    getUnits: async (datasetId) => {
      const units = await getUnits(datasetId, {});
      return units;
    },
  });

  const update = useUpdate();

  const setValue = useCallback(
    (u: (draft: Draft<DatasetsContext>) => void) => {
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

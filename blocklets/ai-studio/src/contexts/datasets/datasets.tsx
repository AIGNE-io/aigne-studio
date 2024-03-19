import { useUpdate } from 'ahooks';
import { Draft, produce } from 'immer';
import { ReactNode, createContext, useCallback, useContext, useRef } from 'react';

import Dataset from '../../../api/src/store/models/dataset/dataset';
import { createDataset, createDocument, deleteDataset, getDatasets, getDocuments } from '../../libs/dataset';

export interface DatasetsContext {
  datasets: Dataset[];
  loading: boolean;
  error?: Error;
  refetch: (projectId?: string) => Promise<void>;
  createDataset: any;
  deleteDataset: any;
  createDocument: typeof createDocument;
  getDocuments: typeof getDocuments;
}

const ctx = createContext<DatasetsContext | undefined>(undefined);

export function DatasetsProvider({ children }: { children: ReactNode }) {
  const value = useRef<DatasetsContext>({
    datasets: [],
    loading: false,
    refetch: async (projectId?: string) => {
      const state = value.current;

      if (state.loading) {
        return;
      }

      setValue((v) => {
        v.loading = true;
        v.datasets = [];
      });
      try {
        const datasets = await getDatasets(projectId);

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
    createDataset: async (
      projectId: string,
      input: { name?: string | null; description?: string | null; projectId?: string }
    ) => {
      const dataset = await createDataset(input);
      await value.current.refetch(projectId);
      return dataset;
    },
    deleteDataset: async (projectId: string, datasetId: string) => {
      await deleteDataset(datasetId);
      await value.current.refetch(projectId);
    },
    createDocument: async (datasetId, input: { type: string; name: string; content?: string }) => {
      const document = await createDocument(datasetId, input);
      return document;
    },
    getDocuments: async (datasetId) => {
      const documents = await getDocuments(datasetId, {});
      return documents;
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

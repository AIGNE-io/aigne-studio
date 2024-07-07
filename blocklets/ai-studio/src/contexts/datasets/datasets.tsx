import { useUpdate } from 'ahooks';
import { Draft, produce } from 'immer';
import { ReactNode, createContext, useCallback, useContext, useRef } from 'react';

import Dataset from '../../../api/src/store/models/dataset/dataset';
import {
  createDataset,
  createTextDocument,
  deleteDataset,
  getDatasets,
  getDocuments,
  updateDataset,
  updateTextDocument,
} from '../../libs/dataset';

export interface DatasetsContext {
  datasets: (Dataset & { blockletDid?: string })[];
  loading: boolean;
  error?: Error;
  refetch: (projectId?: string) => Promise<void>;
  createDataset: any;
  deleteDataset: any;
  updateDataset: (projectId: string, datasetId: string, data: { name: string; description: string }) => Promise<void>;
  createTextDocument: typeof createTextDocument;
  updateTextDocument: typeof updateTextDocument;
  getDocuments: typeof getDocuments;
}

const ctx = createContext<DatasetsContext | undefined>(undefined);

export function DatasetsProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const value = useRef<DatasetsContext>({
    datasets: [],
    loading: false,
    refetch: async () => {
      const state = value.current;

      if (state.loading) {
        return;
      }

      setValue((v) => {
        v.loading = true;
      });
      try {
        const datasets = await getDatasets({ projectId });

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
      input: { name?: string | null; description?: string | null; appId?: string }
    ) => {
      const dataset = await createDataset(input);
      await value.current.refetch(projectId);
      return dataset;
    },
    updateDataset: async (projectId: string, datasetId: string, input: { name: string; description: string }) => {
      await updateDataset(datasetId, input);
      await value.current.refetch(projectId);
    },
    deleteDataset: async (projectId: string, datasetId: string) => {
      await deleteDataset(datasetId);
      await value.current.refetch(projectId);
    },
    createTextDocument: async (datasetId, input: { name: string; content?: string }) => {
      const document = await createTextDocument(datasetId, input);
      return document;
    },
    updateTextDocument: async (datasetId, documentId, input: { name: string; content?: string }) => {
      const document = await updateTextDocument(datasetId, documentId, input);
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

import { useUpdate } from 'ahooks';
import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import { Draft, produce } from 'immer';
import { ReactNode, createContext, useCallback, useContext, useRef } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';

import {
  KnowledgeCard,
  createDataset,
  createDatasetFromResources,
  createTextDocument,
  deleteDataset,
  getDocuments,
  getKnowledgeList,
  getResourcesKnowledgeList,
  updateDataset,
  updateTextDocument,
} from '../../libs/dataset';
import type { KnowledgeInput } from '../../libs/dataset';

export interface KnowledgeContext {
  datasets: KnowledgeCard[];
  loading: boolean;
  resourceLoading: boolean;
  resources: KnowledgeCard[];
  error?: Error;
  refetch: (projectId?: string) => Promise<void>;
  createDataset: any;
  deleteDataset: any;
  updateDataset: (projectId: string, datasetId: string, data: { name: string; description: string }) => Promise<void>;
  createTextDocument: typeof createTextDocument;
  updateTextDocument: typeof updateTextDocument;
  getDocuments: typeof getDocuments;
  getResourcesKnowledgeList: () => Promise<void>;
  createDatasetFromResources: typeof createDatasetFromResources;
}

const ctx = createContext<KnowledgeContext | undefined>(undefined);

export const useFetchKnowledgeList = (projectId: string) => {
  const dataState = useInfiniteScroll(
    async (
      d: { list: KnowledgeCard[]; next: boolean; size: number; page: number } = {
        list: [],
        next: false,
        size: 20,
        page: 1,
      }
    ) => {
      const { page, size } = d || {};
      const list = await getKnowledgeList({ page, size, projectId });

      return { list: list || [], next: list.length >= size, size, page: (d?.page || 1) + 1 };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState };
};

export function KnowledgeProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const value = useRef<KnowledgeContext>({
    datasets: [],
    loading: false,
    resourceLoading: false,
    resources: [],
    refetch: async () => {
      const state = value.current;

      if (state.loading) {
        return;
      }

      setValue((v) => {
        v.loading = true;
      });
      try {
        const datasets = await getKnowledgeList({ projectId });

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
    createDataset: async (projectId: string, input: KnowledgeInput) => {
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
    getResourcesKnowledgeList: async () => {
      const state = value.current;

      if (state.resourceLoading) return;

      setValue((v) => {
        v.resourceLoading = true;
      });
      try {
        const resources = await getResourcesKnowledgeList();
        setValue((v) => (v.resources = resources));
      } catch (error) {
        setValue((v) => (v.error = error));
        throw error;
      } finally {
        setValue((v) => (v.resourceLoading = false));
      }
    },
    createDatasetFromResources: async (input: { items: KnowledgeInput[] }) => {
      const datasets = await createDatasetFromResources(input);
      return datasets;
    },
  });

  const update = useUpdate();

  const setValue = useCallback(
    (u: (draft: Draft<KnowledgeContext>) => void) => {
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

export function useKnowledge() {
  const state = useContext(ctx);

  if (!state) {
    throw new Error('`useKnowledge()` is only allowed to be used in a child of `KnowledgeProvider`');
  }

  return state;
}

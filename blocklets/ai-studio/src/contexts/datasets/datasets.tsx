import { useUpdate } from 'ahooks';
import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import { Draft, produce } from 'immer';
import { ReactNode, createContext, useCallback, useContext, useRef } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';

import {
  KnowledgeCard,
  createDatasetFromResources,
  createKnowledge,
  deleteKnowledge,
  getDocuments,
  getKnowledge,
  getKnowledgeList,
  getResourcesKnowledgeList,
  updateKnowledge,
} from '../../libs/dataset';
import type { KnowledgeInput } from '../../libs/dataset';

export interface KnowledgeContext {
  datasets: KnowledgeCard[];
  loading: boolean;
  resourceLoading: boolean;
  resources: KnowledgeCard[];
  error?: Error;
  refetch: (projectId?: string) => Promise<void>;
  createKnowledge: (input: KnowledgeInput) => Promise<KnowledgeCard>;
  getKnowledge: (knowledgeId: string) => Promise<KnowledgeCard>;
  deleteKnowledge: (projectId: string, datasetId: string) => Promise<void>;
  updateKnowledge: typeof updateKnowledge;
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

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const value = useRef<KnowledgeContext>({
    datasets: [],
    loading: false,
    resourceLoading: false,
    resources: [],
    refetch: async () => {},
    createKnowledge,
    getKnowledge,
    updateKnowledge,
    deleteKnowledge,
    getDocuments,
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

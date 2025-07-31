import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import { useCallback, useEffect } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';

import { getDocument, getSegments } from '../../libs/knowledge';
import { SegmentState, useKnowledgeSegmentsStore } from '../../store/knowledge-segments-store';

export const useSegmentState = (knowledgeId: string, documentId: string) => {
  const key = `${knowledgeId}-${documentId}`;
  const { getState, updateState } = useKnowledgeSegmentsStore();
  const state = getState(key);

  return [state, (updater: (state: SegmentState) => SegmentState) => updateState(key, updater)] as const;
};

export const useSegments = (
  knowledgeId: string,
  documentId: string,
  { autoFetch = true }: { autoFetch?: true } = {}
) => {
  const [state, setState] = useSegmentState(knowledgeId, documentId);

  const refetch = useCallback(async () => {
    try {
      setState((v) => ({ ...v, loading: true }));

      const [{ dataset, document }, { items, total }] = await Promise.all([
        getDocument(knowledgeId, documentId),
        getSegments(knowledgeId, documentId),
      ]);

      setState((v) => ({
        ...v,
        loading: false,
        error: undefined,
        dataset,
        document,
        segments: items,
        total,
      }));
    } catch (error) {
      setState((v) => ({ ...v, loading: false, error: error as Error }));
      throw error;
    }
  }, [knowledgeId, documentId, setState]);

  useEffect(() => {
    if (autoFetch && !state.dataset) {
      refetch();
    }
  }, [knowledgeId, documentId]);

  return { state, refetch };
};

export const useFetchSegments = (knowledgeId: string, documentId: string) => {
  const dataState = useInfiniteScroll(
    async (
      d: { list: any[]; next: boolean; size: number; page: number } = {
        list: [],
        next: false,
        size: 20,
        page: 1,
      }
    ) => {
      const { page = 1, size = 20 } = d || {};
      const { items, total } = await getSegments(knowledgeId, documentId, { page, size });

      const list = (d?.list?.length || 0) + items.length;
      const next = Boolean(list < total);
      return { list: items || [], next, size, page: (d?.page || 1) + 1, total };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [knowledgeId, documentId] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState };
};

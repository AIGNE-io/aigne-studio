import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import { useCallback, useEffect } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { RecoilState, atom, useRecoilState } from 'recoil';

import Dataset from '../../../api/src/store/models/dataset/dataset';
import DatasetDocument from '../../../api/src/store/models/dataset/document';
import DatasetSegment from '../../../api/src/store/models/dataset/segment';
import { getDocument, getSegments } from '../../libs/dataset';

interface SegmentState {
  dataset?: Dataset;
  document?: DatasetDocument;
  segments?: DatasetSegment[];
  loading?: boolean;
  error?: Error;
  page: number;
  size: number;
  total?: number;
}

const datasets: Record<string, RecoilState<SegmentState>> = {};

const dataset = (datasetId: string, documentId: string) => {
  const key = `${datasetId}-${documentId}`;

  let dataset = datasets[key];
  if (!dataset) {
    dataset = atom<SegmentState>({ key: `dataset-${key}`, default: { page: 0, size: 20, loading: true } });
    datasets[key] = dataset;
  }

  return dataset;
};

export const useSegmentState = (datasetId: string, documentId: string) =>
  useRecoilState(dataset(datasetId, documentId));

export const useSegments = (datasetId: string, documentId: string, { autoFetch = true }: { autoFetch?: true } = {}) => {
  const [state, setState] = useSegmentState(datasetId, documentId);

  const refetch = useCallback(async () => {
    try {
      setState((v) => ({ ...v, loading: true }));

      const [{ dataset, document }, { items, total }] = await Promise.all([
        getDocument(datasetId, documentId),
        getSegments(datasetId, documentId),
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
      setState((v) => ({ ...v, loading: false, error }));
      throw error;
    }
  }, [datasetId, documentId, setState]);

  useEffect(() => {
    if (autoFetch && !state.dataset) {
      refetch();
    }
  }, [datasetId, documentId]);

  return { state, refetch };
};

export const useFetchSegments = (datasetId: string, documentId: string) => {
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
      const { items, total } = await getSegments(datasetId, documentId, { page, size });

      const list = (d?.list?.length || 0) + items.length;
      const next = Boolean(list < total);
      return { list: items || [], next, size, page: (d?.page || 1) + 1, total };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [datasetId, documentId] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState };
};

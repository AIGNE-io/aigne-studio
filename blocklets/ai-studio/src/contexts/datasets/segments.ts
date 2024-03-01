import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import Dataset from '../../../api/src/store/models/dataset/dataset';
import DatasetItem from '../../../api/src/store/models/dataset/document';
import DatasetSegment from '../../../api/src/store/models/dataset/segment';
import { getErrorMessage } from '../../libs/api';
import { createSegment, deleteSegment, getDocument, getSegments } from '../../libs/dataset';

interface SegmentState {
  dataset?: Dataset;
  document?: DatasetItem;
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
    dataset = atom<SegmentState>({
      key: `dataset-${key}`,
      default: { page: 0, size: 20 },
    });

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

  const create = useCallback(async (content: string) => {
    try {
      await createSegment(datasetId, documentId, content);
    } catch (error) {
      Toast.error(getErrorMessage(error));
    }
  }, []);

  const remove = useCallback(async (segmentId: string) => {
    try {
      await deleteSegment(segmentId);
    } catch (error) {
      Toast.error(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (autoFetch && !state.dataset && !state.loading) {
      refetch();
    }
  }, [datasetId, documentId]);

  return { state, refetch, create, remove };
};

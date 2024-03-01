import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import DatasetItem from '../../api/src/store/models/dataset/item';
import Dataset from '../../api/src/store/models/dataset/list';
import DatasetSegment from '../../api/src/store/models/dataset/segment';
import { getErrorMessage } from '../libs/api';
import { createSegment, deleteSegment, getSegments, getUnit } from '../libs/dataset';

interface SegmentState {
  dataset?: Dataset;
  unit?: DatasetItem;
  segments?: DatasetSegment[];
  loading?: boolean;
  error?: Error;
  page: number;
  size: number;
  total?: number;
}

const datasets: Record<string, RecoilState<SegmentState>> = {};

const dataset = (datasetId: string, unitId: string) => {
  const key = `${datasetId}-${unitId}`;

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

export const useSegmentState = (datasetId: string, unitId: string) => useRecoilState(dataset(datasetId, unitId));

export const useSegments = (datasetId: string, unitId: string, { autoFetch = true }: { autoFetch?: true } = {}) => {
  const [state, setState] = useSegmentState(datasetId, unitId);

  const refetch = useCallback(async () => {
    try {
      setState((v) => ({ ...v, loading: true }));

      const [{ dataset, unit }, { items, total }] = await Promise.all([
        getUnit(datasetId, unitId),
        getSegments(datasetId, unitId),
      ]);

      setState((v) => ({
        ...v,
        loading: false,
        error: undefined,
        dataset,
        unit,
        segments: items,
        total,
      }));
    } catch (error) {
      setState((v) => ({ ...v, loading: false, error }));
      throw error;
    }
  }, [datasetId, unitId, setState]);

  const create = useCallback(async (content: string) => {
    try {
      await createSegment(datasetId, unitId, content);
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
  }, [datasetId, unitId]);

  return { state, refetch, create, remove };
};

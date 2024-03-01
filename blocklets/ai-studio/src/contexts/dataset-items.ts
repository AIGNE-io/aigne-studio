import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import DatasetItem from '../../api/src/store/models/dataset/item';
import Dataset from '../../api/src/store/models/dataset/list';
import { getErrorMessage } from '../libs/api';
import { deleteDocument, getDataset, getDocuments } from '../libs/dataset';

interface DatasetState {
  dataset?: Dataset;
  items?: DatasetItem[];
  page: number;
  size: number;
  total?: number;
  loading?: boolean;
  error?: Error;
}

const datasets: Record<string, RecoilState<DatasetState>> = {};

const dataset = (datasetId: string) => {
  let dataset = datasets[datasetId];
  if (!dataset) {
    dataset = atom<DatasetState>({
      key: `dataset-${datasetId}`,
      default: { page: 0, size: 20 },
    });

    datasets[datasetId] = dataset;
  }
  return dataset;
};

export const useDatasetState = (datasetId: string) => useRecoilState(dataset(datasetId));

export const useDataset = (datasetId: string, { autoFetch = true }: { autoFetch?: true } = {}) => {
  const [state, setState] = useDatasetState(datasetId);

  const refetch = useCallback(
    async (options: { page?: number; size?: number } = {}) => {
      let { page, size } = options;

      try {
        setState((v) => {
          page ??= v.page;
          size ??= v.size;
          return { ...v, loading: true };
        });
        const [dataset, { items, total }] = await Promise.all([
          getDataset(datasetId),
          getDocuments(datasetId, { page: (page ?? 0) + 1, size }),
        ]);
        setState((v) => ({
          ...v,
          loading: false,
          error: undefined,
          dataset,
          items,
          total,
        }));
      } catch (error) {
        setState((v) => ({
          ...v,
          loading: false,
          error,
        }));
        throw error;
      } finally {
        setState((v) => ({
          ...v,
          page: page ?? v.page,
          size: size ?? v.size,
        }));
      }
    },
    [datasetId, setState]
  );

  const remove = useCallback(async (datasetId: string, documentId: string) => {
    try {
      await deleteDocument(datasetId, documentId);
    } catch (error) {
      Toast.error(getErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    if (autoFetch && !state.dataset && !state.loading) {
      refetch();
    }
  }, []);

  return { state, refetch, remove };
};

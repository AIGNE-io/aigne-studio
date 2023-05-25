import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { DatasetItem } from '../../api/src/store/dataset-items';
import { Dataset } from '../../api/src/store/datasets';
import { getDataset, getDatasetItems } from '../libs/datasets';

interface DatasetState {
  dataset?: Dataset;
  items?: DatasetItem[];
  loading?: boolean;
  error?: Error;
}

const datasets: Record<string, RecoilState<DatasetState>> = {};

const dataset = (datasetId: string) => {
  let dataset = datasets[datasetId];
  if (!dataset) {
    dataset = atom<DatasetState>({
      key: `dataset-${datasetId}`,
      default: {},
    });
    datasets[datasetId] = dataset;
  }
  return dataset;
};

export const useDatasetState = (datasetId: string) => useRecoilState(dataset(datasetId));

export const useDataset = (datasetId: string, { autoFetch = true }: { autoFetch?: true } = {}) => {
  const [state, setState] = useDatasetState(datasetId);

  const refetch = useCallback(async () => {
    try {
      setState((v) => ({ ...v, loading: true }));
      const [dataset, { items }] = await Promise.all([getDataset(datasetId), getDatasetItems({ datasetId })]);
      setState((v) => ({ ...v, loading: false, error: undefined, dataset, items }));
    } catch (error) {
      setState((v) => ({ ...v, loading: false, error }));
      throw error;
    }
  }, [datasetId, setState]);

  useEffect(() => {
    if (autoFetch && !state.dataset && !state.loading) {
      refetch();
    }
  }, []);

  return { state, refetch };
};

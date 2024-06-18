import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import Dataset from '../../../api/src/store/models/dataset/dataset';
import DatasetDocument from '../../../api/src/store/models/dataset/document';
import { getErrorMessage } from '../../libs/api';
import { deleteDocument, getDataset, getDocuments } from '../../libs/dataset';

interface DatasetState {
  dataset?: Dataset & { blockletDid?: string };
  items?: DatasetDocument[];
  page: number;
  size: number;
  total?: number;
  loading?: boolean;
  error?: Error;
}

const datasets: Record<string, RecoilState<DatasetState>> = {};

const dataset = (datasetId: string, blockletDid?: string) => {
  let dataset = datasets[datasetId];
  if (!dataset) {
    dataset = atom<DatasetState>({
      key: `dataset-${datasetId}-${blockletDid}`,
      default: { page: 0, size: 20, loading: true },
    });
    datasets[datasetId] = dataset;
  }
  return dataset;
};

export const useDocumentState = (datasetId: string, blockletDid?: string) =>
  useRecoilState(dataset(datasetId, blockletDid));

export const useDocuments = (
  datasetId: string,
  { blockletDid, autoFetch = true }: { blockletDid?: string; autoFetch?: true } = {}
) => {
  const [state, setState] = useDocumentState(datasetId, blockletDid);

  const refetch = useCallback(
    async (options: { page?: number; size?: number } = {}) => {
      const { page, size } = options;

      try {
        const { items, total } = await getDocuments(datasetId, { blockletDid, page: (page ?? 0) + 1, size });

        setState((v) => ({ ...v, items, total }));
      } catch (error) {
        setState((v) => ({ ...v, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, page: page ?? v.page, size: size ?? v.size }));
      }
    },
    [datasetId, setState]
  );

  const init = useCallback(
    async (options: { page?: number; size?: number } = {}) => {
      let { page, size } = options;

      try {
        setState((v) => {
          page ??= v.page;
          size ??= v.size;
          return { ...v, loading: true };
        });

        const [dataset] = await Promise.all([getDataset(datasetId), refetch()]);
        setState((v) => ({ ...v, loading: false, error: undefined, dataset }));
      } catch (error) {
        setState((v) => ({ ...v, loading: false, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, page: page ?? v.page, size: size ?? v.size }));
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
    if (autoFetch && !state.dataset) {
      init();
    }
  }, []);

  return { state, refetch, remove };
};

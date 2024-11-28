import Toast from '@arcblock/ux/lib/Toast';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import Knowledge from '../../../api/src/store/models/dataset/dataset';
import KnowledgeDocument from '../../../api/src/store/models/dataset/document';
import { getErrorMessage } from '../../libs/api';
import { deleteDocument, getDocuments, getKnowledge } from '../../libs/knowledge';

interface DatasetState {
  dataset?: Knowledge & { blockletDid?: string };
  items?: KnowledgeDocument[];
  page: number;
  size: number;
  total?: number;
  loading?: boolean;
  error?: Error;
}

const datasets: Record<string, RecoilState<DatasetState>> = {};

const dataset = (knowledgeId: string, blockletDid?: string) => {
  let dataset = datasets[knowledgeId];
  if (!dataset) {
    dataset = atom<DatasetState>({
      key: `dataset-${knowledgeId}-${blockletDid}`,
      default: { page: 0, size: 20, loading: true },
    });
    datasets[knowledgeId] = dataset;
  }
  return dataset;
};

export const useDocumentState = (knowledgeId: string, blockletDid?: string) =>
  useRecoilState(dataset(knowledgeId, blockletDid));

export const useDocuments = (
  knowledgeId: string,
  { blockletDid, autoFetch = true }: { blockletDid?: string; autoFetch?: true } = {}
) => {
  const [state, setState] = useDocumentState(knowledgeId, blockletDid);

  const refetch = useCallback(
    async (options: { page?: number; size?: number } = {}) => {
      const { page, size } = options;

      try {
        const [{ items, total }, dataset] = await Promise.all([
          getDocuments(knowledgeId, { blockletDid, page: (page ?? 0) + 1, size }),
          getKnowledge(knowledgeId),
        ]);

        setState((v) => ({ ...v, dataset, items, total }));
      } catch (error) {
        setState((v) => ({ ...v, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, page: page ?? v.page, size: size ?? v.size }));
      }
    },
    [knowledgeId, setState]
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

        const [dataset] = await Promise.all([getKnowledge(knowledgeId), refetch()]);
        setState((v) => ({ ...v, loading: false, error: undefined, dataset }));
      } catch (error) {
        setState((v) => ({ ...v, loading: false, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, page: page ?? v.page, size: size ?? v.size }));
      }
    },
    [knowledgeId, setState]
  );

  const remove = useCallback(async (knowledgeId: string, documentId: string) => {
    try {
      await deleteDocument(knowledgeId, documentId);
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

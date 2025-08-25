import Toast from '@arcblock/ux/lib/Toast';
import { useMemoizedFn } from 'ahooks';
import { useCallback, useEffect } from 'react';

import { getErrorMessage } from '../../libs/api';
import { deleteDocument, getDocuments, getKnowledge } from '../../libs/knowledge';
import { DatasetState, useKnowledgeDocumentsStore } from '../../store/knowledge-documents-store';

export const useDocumentState = (knowledgeId: string, blockletDid?: string) => {
  const key = `${knowledgeId}-${blockletDid || ''}`;
  const { getState, updateState } = useKnowledgeDocumentsStore();
  const state = getState(key);
  const setState = useMemoizedFn((updater: (state: DatasetState) => DatasetState) => updateState(key, updater));

  return [state, setState] as const;
};

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
        setState((v) => ({ ...v, error: error as Error }));
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
        setState((v) => ({ ...v, loading: false, error: error as Error }));
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

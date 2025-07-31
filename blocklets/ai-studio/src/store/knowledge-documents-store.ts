import { produce } from 'immer';
import { create } from 'zustand';

import Knowledge from '../../api/src/store/models/dataset/dataset';
import KnowledgeDocument from '../../api/src/store/models/dataset/document';

export interface DatasetState {
  dataset?: Knowledge & { blockletDid?: string };
  items?: KnowledgeDocument[];
  page: number;
  size: number;
  total?: number;
  loading?: boolean;
  error?: Error;
}

interface KnowledgeDocumentsStore {
  states: { [key: string]: DatasetState };
  setState: (key: string, state: DatasetState) => void;
  updateState: (key: string, updater: (state: DatasetState) => DatasetState) => void;
  getState: (key: string) => DatasetState;
}

export const useKnowledgeDocumentsStore = create<KnowledgeDocumentsStore>()((set, get) => ({
  states: {},
  setState: (key, state) =>
    set(
      produce((draft) => {
        draft.states[key] = state;
      })
    ),
  updateState: (key, updater) =>
    set(
      produce((draft) => {
        draft.states[key] = updater(draft.states[key] || { page: 0, size: 20, loading: true });
      })
    ),
  getState: (key) => get().states[key] || { page: 0, size: 20, loading: true },
}));

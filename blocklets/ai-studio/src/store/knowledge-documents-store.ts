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

// 提炼重复的默认状态创建函数
const createDefaultDatasetState = (): DatasetState => ({
  page: 0,
  size: 20,
  loading: true,
});

export const useKnowledgeDocumentsStore = create<KnowledgeDocumentsStore>()((set, get) => ({
  states: {},
  setState: (key, state) =>
    set((prevState) => ({
      ...prevState,
      states: {
        ...prevState.states,
        [key]: state,
      },
    })),
  updateState: (key, updater) =>
    set((prevState) => {
      const currentState = prevState.states[key] || createDefaultDatasetState();
      const newState = updater(currentState);
      return {
        ...prevState,
        states: {
          ...prevState.states,
          [key]: newState,
        },
      };
    }),
  getState: (key) => get().states[key] || createDefaultDatasetState(),
}));

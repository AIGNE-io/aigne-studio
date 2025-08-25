import { create } from 'zustand';

import Knowledge from '../../api/src/store/models/dataset/dataset';
import KnowledgeDocument from '../../api/src/store/models/dataset/document';
import DatasetSegment from '../../api/src/store/models/dataset/segment';

export interface SegmentState {
  dataset?: Knowledge;
  document?: KnowledgeDocument;
  segments?: DatasetSegment[];
  loading?: boolean;
  error?: Error;
  page: number;
  size: number;
  total?: number;
}

interface KnowledgeSegmentsStore {
  states: { [key: string]: SegmentState };
  setState: (key: string, state: SegmentState) => void;
  updateState: (key: string, updater: (state: SegmentState) => SegmentState) => void;
  getState: (key: string) => SegmentState;
}

// 提炼重复的默认状态创建函数
const createDefaultSegmentState = (): SegmentState => ({
  page: 0,
  size: 20,
  loading: true,
});

export const useKnowledgeSegmentsStore = create<KnowledgeSegmentsStore>()((set, get) => ({
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
      const currentState = prevState.states[key] || createDefaultSegmentState();
      const newState = updater(currentState);
      return {
        ...prevState,
        states: {
          ...prevState.states,
          [key]: newState,
        },
      };
    }),
  getState: (key) => get().states[key] || createDefaultSegmentState(),
}));

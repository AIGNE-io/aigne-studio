import { produce } from 'immer';
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

export const useKnowledgeSegmentsStore = create<KnowledgeSegmentsStore>()((set, get) => ({
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

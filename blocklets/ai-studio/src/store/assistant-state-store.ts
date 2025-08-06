import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { create } from 'zustand';

export type AssistantYjsWithParents = AssistantYjs & { parent: string[] };

export interface AssistantState {
  created: AssistantYjsWithParents[];
  deleted: AssistantYjsWithParents[];
  modified: AssistantYjsWithParents[];
  createdMap: { [key: string]: AssistantYjsWithParents };
  modifiedMap: { [key: string]: AssistantYjsWithParents };
  deletedMap: { [key: string]: AssistantYjsWithParents };
  disabled: boolean;
  loading: boolean;
  assistants: AssistantYjsWithParents[];
  files: AssistantYjsWithParents[];
}

// 提炼重复的默认状态
const getDefaultAssistantState = (): AssistantState => ({
  created: [],
  deleted: [],
  modified: [],
  createdMap: {},
  modifiedMap: {},
  deletedMap: {},
  disabled: false,
  loading: false,
  assistants: [],
  files: [],
});

interface AssistantStateStore {
  states: { [key: string]: AssistantState };
  setState: (key: string, state: AssistantState) => void;
  updateState: (key: string, updater: (state: AssistantState) => AssistantState) => void;
  getState: (key: string) => AssistantState;
}

export const useAssistantStateStore = create<AssistantStateStore>()((set, get) => ({
  states: {},
  setState: (key, state) =>
    set((currentState) => ({
      ...currentState,
      states: {
        ...currentState.states,
        [key]: state,
      },
    })),
  updateState: (key, updater) =>
    set((currentState) => ({
      ...currentState,
      states: {
        ...currentState.states,
        [key]: updater(currentState.states[key] || getDefaultAssistantState()),
      },
    })),
  getState: (key) => get().states[key] || getDefaultAssistantState(),
}));

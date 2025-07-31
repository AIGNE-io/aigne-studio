import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { produce } from 'immer';
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

interface AssistantStateStore {
  states: { [key: string]: AssistantState };
  setState: (key: string, state: AssistantState) => void;
  updateState: (key: string, updater: (state: AssistantState) => AssistantState) => void;
  getState: (key: string) => AssistantState;
}

export const useAssistantStateStore = create<AssistantStateStore>()((set, get) => ({
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
        draft.states[key] = updater(
          draft.states[key] || {
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
          }
        );
      })
    ),
  getState: (key) =>
    get().states[key] || {
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
    },
}));

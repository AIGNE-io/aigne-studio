import { produce } from 'immer';
import { create } from 'zustand';

interface CallAgentCustomOutputDialogState {
  open?: boolean;
  output?: {
    id?: string;
    agentInstanceId: string;
    outputVariableId?: string;
  };
  name?: string;
}

interface CallAgentOutputDialogStore {
  states: { [key: string]: CallAgentCustomOutputDialogState };
  setState: (key: string, state: CallAgentCustomOutputDialogState) => void;
  updateState: (
    key: string,
    updater: (state: CallAgentCustomOutputDialogState) => CallAgentCustomOutputDialogState
  ) => void;
  resetState: (key: string) => void;
}

export const useCallAgentOutputDialogStore = create<CallAgentOutputDialogStore>()((set) => ({
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
        draft.states[key] = updater(draft.states[key] || {});
      })
    ),
  resetState: (key) =>
    set(
      produce((draft) => {
        delete draft.states[key];
      })
    ),
}));

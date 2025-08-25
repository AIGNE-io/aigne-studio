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

// 提炼重复的默认状态
const getDefaultDialogState = (): CallAgentCustomOutputDialogState => ({});

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
        [key]: updater(currentState.states[key] || getDefaultDialogState()),
      },
    })),
  resetState: (key) =>
    set((currentState) => {
      const newStates = { ...currentState.states };
      delete newStates[key];
      return {
        ...currentState,
        states: newStates,
      };
    }),
}));

import { RunAssistantConsole } from '@blocklet/ai-runtime/core';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Logs = Array<RunAssistantConsole>;

type LogsActions = {
  setLogs: (val: RunAssistantConsole) => void;
  clearLogs(): void;
};

type LogsState = {
  logs: Logs;
};

type LogsStore = LogsState & LogsActions;

const DefaultState: LogsState = {
  logs: [],
};

const logsStore = create<LogsStore>()(
  immer(
    devtools((set, get) => ({
      ...DefaultState,
      setLogs: (val) => {
        const { logs } = get();
        set({
          logs: [...logs, val],
        });
      },
      clearLogs: () => {
        set({
          logs: [],
        });
      },
    }))
  )
);

export default logsStore;

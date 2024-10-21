import { createContext, useContext, useState } from 'react';
import { StoreApi, UseBoundStore, create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { RuntimeOutputVariable } from '../../types';

export interface DebugContextValue {
  agentId?: string;
  outputId?: string;
  open: (options: { agentId?: string; output?: { id: string } | { name: RuntimeOutputVariable } }) => void;
  close: () => void;
}

const debugContext = createContext<UseBoundStore<StoreApi<DebugContextValue>> | null>(null);

export function DebugProvider({
  children,
  openSettings,
}: {
  children?: React.ReactNode;
  openSettings: (options: { agentId: string; output: { id: string } | { name: RuntimeOutputVariable } }) => {
    agentId?: string;
    outputId?: string;
  };
}) {
  const [state] = useState(() =>
    create(
      immer<DebugContextValue>((set, get) => ({
        open: ({ output, ...options }) => {
          const agentId = options.agentId || get().agentId;
          if (!agentId || !output) return;

          const { outputId } = openSettings({ agentId, output });
          set((state) => {
            state.agentId = agentId;
            state.outputId = outputId;
          });
        },
        close: () => {
          set((state) => {
            state.agentId = undefined;
            state.outputId = undefined;
          });
        },
      }))
    )
  );

  return <debugContext.Provider value={state}>{children}</debugContext.Provider>;
}

export function useDebug<U>(selector: (state: DebugContextValue) => U): U | undefined {
  const ctx = useContext(debugContext);
  if (!ctx) return undefined;

  return ctx(selector);
}

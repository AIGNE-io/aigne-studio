import { createContext, useContext, useState } from 'react';
import { StoreApi, UseBoundStore, create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { RuntimeOutputVariable } from '../../types';

export interface DebugContextValue {
  agentId?: string;
  outputId?: string;
  hoverOutputId?: string;
  tabId?: string;
  setTabId?: (id: string) => void;
  setHoverOutputId: (id: string) => void;
  open: (options: { agentId?: string; output?: { id: string } | { name: RuntimeOutputVariable } }) => void;
  close: () => void;
}

const debugContext = createContext<UseBoundStore<StoreApi<DebugContextValue>> | null>(null);

export function DebugProvider({
  children,
  openSettings,
  agentId: defaultAgentId,
}: {
  children?: React.ReactNode;
  openSettings: (options: { agentId: string; output: { id: string } | { name: RuntimeOutputVariable } }) => {
    agentId?: string;
    outputId?: string;
  };
  agentId?: string;
}) {
  const [state] = useState(() =>
    create(
      immer<DebugContextValue>((set, get) => ({
        agentId: defaultAgentId,
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
            state.agentId = defaultAgentId;
            state.outputId = undefined;
            state.hoverOutputId = undefined;
          });
        },
        // hover Tab Show Output Component
        setHoverOutputId: (id: string) => {
          set((state) => {
            state.hoverOutputId = id;
          });
        },
        // hover Output Component Show Tab
        setTabId: (id: string) => {
          set((state) => {
            state.tabId = id;
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

export interface DebugDialogContextValue {
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const debugDialogContext = createContext<UseBoundStore<StoreApi<DebugDialogContextValue>> | null>(null);

export function DebugDialogProvider({ children }: { children?: React.ReactNode }) {
  const [state] = useState(() =>
    create(
      immer<DebugDialogContextValue>((set) => ({
        setOpen: (open) => {
          set((state) => {
            state.open = open;
          });
        },
      }))
    )
  );

  return <debugDialogContext.Provider value={state}>{children}</debugDialogContext.Provider>;
}

export function useDebugDialog<U>(selector: (state: DebugDialogContextValue) => U): U | undefined {
  const ctx = useContext(debugDialogContext);
  if (!ctx) return undefined;

  return ctx(selector);
}

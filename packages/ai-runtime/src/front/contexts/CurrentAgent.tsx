import { ReactNode, createContext, useContext, useMemo } from 'react';

export interface CurrentAgentState {
  aid: string;
}

const context = createContext<CurrentAgentState | undefined>(undefined);

export function CurrentAgentProvider({ aid, children }: { aid: string; children?: ReactNode }) {
  const value = useMemo(() => ({ aid }), [aid]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export const useCurrentAgent = () => {
  const ctx = useContext(context);

  if (!ctx) {
    throw new Error('No such current agent state. You should use `useCurrentAgent` within the `CurrentAgentProvider`');
  }

  return ctx;
};

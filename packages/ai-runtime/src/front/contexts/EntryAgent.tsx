import { ReactNode, createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CustomError } from '../error';

export interface EntryAgentContext {
  aid: string;
}

const activeAgentContext = createContext<EntryAgentContext | undefined>(undefined);

export const useEntryAgent = () => {
  const context = useContext(activeAgentContext);
  if (!context) {
    throw new Error('No such entryAgentContext. You should use `useEntryAgent` within the `EntryAgentProvider`');
  }

  return context;
};

export const EntryAgentProvider = ({ aid, children }: { aid: string; children?: ReactNode }) => {
  const state = useMemo(() => ({ aid }), [aid]);

  return <activeAgentContext.Provider value={state}>{children}</activeAgentContext.Provider>;
};

export function EntryAgentProviderFromUrl({ children }: { children?: ReactNode }) {
  const [query] = useSearchParams();
  const aid = query.get('aid');
  if (!aid) throw new CustomError(404, 'Missing required query parameters `aid`');

  return <EntryAgentProvider aid={aid}>{children}</EntryAgentProvider>;
}

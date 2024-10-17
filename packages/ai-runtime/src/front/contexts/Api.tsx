import { MouseEvent, ReactNode, createContext, useContext, useMemo } from 'react';

import { RuntimeOutputVariable } from '../../types';
import { Agent, getAgent } from '../api/agent';
import { GetMessagesQuery, Message, getMessages } from '../api/message';
import { Session, clearSession, createSession, deleteSession, getSession, getSessions, runAgent } from '../api/session';

export interface AIGNEApiContextValue {
  // apiUniqueKey is used to identify the api context, so that we can use multiple api context in the same page
  apiUniqueKey?: string;
  getSessions: (options: { aid: string }) => Promise<{ sessions: Session[] }>;
  createSession: (options: { aid: string; name?: string }) => Promise<Session>;
  deleteSession: (options: { sessionId: string }) => Promise<any>;
  clearSession: (options: { sessionId: string }) => Promise<any>;
  getSession: (options: { sessionId: string }) => Promise<Session>;
  getMessages: (options: { sessionId: string } & GetMessagesQuery) => Promise<{ messages: Message[] }>;
  getAgent: (options: { aid: string }) => Promise<Agent>;
  runAgent: typeof runAgent;
  openOutputSettings?: (options: {
    e: MouseEvent;
    aid: string;
    output: { id: string } | { name: RuntimeOutputVariable };
  }) => void;
}

const aigneApiContext = createContext<AIGNEApiContextValue | null>(null);

export const AIGNEApiProvider = aigneApiContext.Provider;

export const AIGNEApiProviderCommon = ({
  working,
  children,
  ...api
}: {
  working?: boolean | ((options: { aid: string }) => boolean | undefined);
  children?: ReactNode;
} & Partial<AIGNEApiContextValue>) => {
  const value = useMemo<AIGNEApiContextValue>(
    () => ({
      ...api,
      getSessions: api.getSessions || getSessions,
      createSession: api.createSession || (({ aid, name }) => createSession({ aid, name }).then((res) => res.created)),
      deleteSession: api.deleteSession || deleteSession,
      clearSession: api.clearSession || clearSession,
      getSession: api.getSession || (({ sessionId }) => getSession({ sessionId }).then((res) => res.session)),
      getMessages: api.getMessages || getMessages,
      getAgent:
        api.getAgent ||
        (({ aid }) => getAgent({ aid, working: typeof working === 'function' ? working({ aid }) : working })),
      runAgent:
        api.runAgent ||
        ((options) =>
          runAgent({
            ...options,
            working: typeof working === 'function' ? working(options) : working,
          } as Parameters<typeof runAgent>[0])),
    }),
    []
  );

  return <AIGNEApiProvider value={value}>{children}</AIGNEApiProvider>;
};

export const useAIGNEApi = () => {
  const ctx = useContext(aigneApiContext);
  if (!ctx) throw new Error('No such agent context. You should use `useAgent` within the `AgentProvider`');

  return ctx;
};

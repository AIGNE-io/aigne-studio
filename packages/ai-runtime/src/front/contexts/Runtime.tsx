import pick from 'lodash/pick';
import { ReactNode, useMemo } from 'react';

import { parseIdentity } from '../../common/aid';
import { RuntimeLocaleProvider } from '../components/RuntimeCommonProvider';
import ThemeProvider from '../components/ThemeProvider';
import { ActiveAgentProvider } from './ActiveAgent';
import { AIGNEApiContextValue, AIGNEApiProvider } from './Api';
import { CurrentAgentProvider } from './CurrentAgent';
import { EntryAgentProvider } from './EntryAgent';
import { SessionProvider } from './Session';
import { SessionsProvider, useSessions } from './Sessions';

export const RuntimeProvider = ({
  children,
  aid,
  working,
  ApiProps,
}: {
  children?: ReactNode;
  aid: string;
  working?: boolean;
  ApiProps?: Partial<AIGNEApiContextValue>;
}) => {
  const projectId = useMemo(() => parseIdentity(aid, { rejectWhenError: true }).projectId, [aid]);

  return (
    <EntryAgentProvider aid={aid}>
      <AIGNEApiProvider
        working={({ aid }) => (parseIdentity(aid, { rejectWhenError: true }).projectId === projectId ? working : false)}
        {...ApiProps}>
        <ThemeProvider>
          <RuntimeLocaleProvider>
            <SessionsProvider aid={aid}>
              <CurrentAgentProvider aid={aid}>
                <ActiveAgentProvider>
                  <RuntimeView>{children}</RuntimeView>
                </ActiveAgentProvider>
              </CurrentAgentProvider>
            </SessionsProvider>
          </RuntimeLocaleProvider>
        </ThemeProvider>
      </AIGNEApiProvider>
    </EntryAgentProvider>
  );
};

function RuntimeView({ children }: { children?: ReactNode }) {
  const {
    currentSessionId,
    setCurrentSessionId,
    reload: reloadSessions,
  } = useSessions((s) => pick(s, 'currentSessionId', 'reload', 'setCurrentSessionId'));

  const onNewSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    await reloadSessions();
  };

  return (
    <SessionProvider sessionId={currentSessionId} onChange={onNewSession}>
      {children}
    </SessionProvider>
  );
}

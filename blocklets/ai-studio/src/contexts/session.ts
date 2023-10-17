import { createAuthServiceSessionContext } from '@arcblock/did-connect/lib/Session';
import { useContext } from 'react';

import { defaultBranch } from '../pages/project/state';

const { SessionProvider, SessionContext, SessionConsumer, withSession } = createAuthServiceSessionContext();

export function useSessionContext(): any {
  return useContext(SessionContext);
}

export { SessionProvider, SessionContext, SessionConsumer, withSession };

export function useIsRole(...roles: string[]) {
  const { session } = useSessionContext();
  return roles.includes(session.user?.role);
}

export const useInitialized = () => useSessionContext().session.initialized;

export const useIsAdmin = () => useIsRole('owner', 'admin');

export const useIsPromptEditor = () => useIsRole('owner', 'admin', 'promptsEditor');

export const useIsReadOnly = ({ ref }: { ref: string }) => !useIsAdmin() && ref === defaultBranch;

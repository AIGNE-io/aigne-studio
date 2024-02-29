import { getDefaultBranch } from '@app/store/current-git-store';
import { createAuthServiceSessionContext } from '@arcblock/did-connect/lib/Session';
import { useContext } from 'react';

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

export const useReadOnly = ({ ref }: { ref: string }) => !useIsAdmin() && ref === getDefaultBranch();

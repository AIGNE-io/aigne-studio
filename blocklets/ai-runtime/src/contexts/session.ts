import { createAuthServiceSessionContext } from '@arcblock/did-connect-react/lib/Session';
import { useContext } from 'react';

const { SessionProvider, SessionContext, SessionConsumer, withSession } = createAuthServiceSessionContext();

export function useSessionContext(): any {
  return useContext(SessionContext);
}

export { SessionProvider, SessionContext, SessionConsumer, withSession };

export function useIsRole(...roles: string[]) {
  const { session: authSession } = useSessionContext();
  return roles.includes(authSession.user?.role);
}

export const ADMIN_ROLES = ['owner', 'admin'];

export const useIsAdmin = () => useIsRole(...ADMIN_ROLES);

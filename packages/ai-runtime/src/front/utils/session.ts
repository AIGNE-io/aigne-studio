import { SessionContext } from '@arcblock/did-connect/lib/Session';
import { useContext } from 'react';

export function useSessionContext(): {
  session: {
    user?: { did: string; fullName: string; avatar: string; role: string };
    loading?: boolean;
    login: (cb?: () => void) => any;
  };
  events: any;
} {
  return useContext(SessionContext);
}

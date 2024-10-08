import { getDefaultBranch } from '@app/store/current-git-store';
import { createAuthServiceSessionContext } from '@arcblock/did-connect/lib/Session';
import { useContext } from 'react';

import { Config } from '../libs/env';

const { SessionProvider, SessionContext, SessionConsumer, withSession } = createAuthServiceSessionContext();

export function useSessionContext(): any {
  return useContext(SessionContext);
}

export { SessionProvider, SessionContext, SessionConsumer, withSession };

export function useIsRole(roles?: string[] | undefined) {
  const { session } = useSessionContext();
  // not provided roles means no restriction
  if (!roles) {
    // login required
    if (session.user?.did) {
      return true;
    }
    return false;
  }
  return roles.includes(session.user?.role);
}

export const ADMIN_ROLES = ['owner', 'admin'];

export const PRO_ROLE = 'aignePro';

export const useInitialized = () => useSessionContext().session.initialized;

export const useIsAdmin = () => useIsRole(ADMIN_ROLES);

export const useIsPromptAdmin = () => useIsRole(Config.serviceModePermissionMap.ensurePromptsAdminRoles);

export const useIsPromptEditor = () => useIsRole(Config.serviceModePermissionMap.ensurePromptsEditorRoles);

export const useReadOnly = ({ ref }: { ref: string }) => !useIsPromptEditor() && ref === getDefaultBranch();

export const useIsProUser = () => {
  const { session } = useSessionContext();
  return session?.user?.passports?.map((x: any) => x.name).includes(PRO_ROLE);
};

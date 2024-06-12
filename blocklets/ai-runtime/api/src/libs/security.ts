import { auth } from '@blocklet/sdk/lib/middlewares';

export const ADMIN_ROLES = ['owner', 'admin'];

export const ensureAdmin = auth({ roles: ADMIN_ROLES });

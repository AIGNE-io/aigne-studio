import { auth } from '@blocklet/sdk/lib/middlewares';
import { Request } from 'express';

export const ADMIN_ROLES = ['owner', 'admin'];

export const ensureAdmin = auth({ roles: ADMIN_ROLES });

export async function ensureAgentAdmin(req: Request, getOwnerId: () => Promise<string | string[]>) {
  if (req.user) {
    if (ADMIN_ROLES.includes(req.user.role)) return true;

    const ownerIds = [await getOwnerId()].flat();
    if (ownerIds.every((i) => i === req.user!.did)) return true;
  }

  throw new Error('Forbidden');
}

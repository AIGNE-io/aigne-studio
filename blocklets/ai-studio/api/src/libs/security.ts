import middlewares from '@blocklet/sdk/lib/middlewares';
import { getVerifyData, verify } from '@blocklet/sdk/lib/util/verify-sign';
import type { NextFunction, Request, Response } from 'express';

import { Config } from './env';
import logger from './logger';

export const ADMIN_ROLES = ['owner', 'admin'];

export const ensureAdmin = middlewares.auth({ roles: ADMIN_ROLES });

// dynamic permission check
export const ensurePromptsAdmin = (req: Request, res: Response, next: NextFunction) =>
  middlewares.auth({ roles: Config.serviceModePermissionMap.ensurePromptsAdminRoles })(req, res, next);

// dynamic permission check
export const ensurePromptsEditor = (req: Request, res: Response, next: NextFunction) =>
  middlewares.auth({ roles: Config.serviceModePermissionMap.ensurePromptsEditorRoles })(req, res, next);

export const isRefReadOnly = ({
  ref,
  defaultBranch,
  project,
  user,
}: {
  ref: string;
  defaultBranch: string;
  project: any;
  user?: { did: string; role?: string };
}) => {
  if (project?.createdBy === user?.did) {
    return false;
  }
  return (
    ref === defaultBranch && ![...(Config.serviceModePermissionMap.ensurePromptsAdminRoles || [])].includes(user?.role!)
  );
};

export function ensureComponentCallOr(fallback: (req: Request, res: Response, next: NextFunction) => any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = req.get('x-component-sig');
      if (sig) {
        const { data, sig } = getVerifyData(req);
        const verified = verify(data, sig);
        if (verified) {
          next();
        } else {
          res.status(401).json({ error: 'verify sig failed' });
        }
      } else {
        fallback(req, res, next);
      }
    } catch (error) {
      logger.error('validate signature of calling error', { error });
      res.status(401).json({ error: 'verify sig failed' });
    }
  };
}

export function ensureComponentCallOrAdmin() {
  return ensureComponentCallOr(ensureAdmin);
}

export function ensureComponentCallOrPromptsAdmin() {
  return ensureComponentCallOr(ensurePromptsAdmin);
}

export function ensureComponentCallOrPromptsEditor() {
  return ensureComponentCallOr(ensurePromptsEditor);
}

// dynamic permission check, not middleware
// if component call, check sig, if not, check user role
export function ensureComponentCallOrRolesMatch(req: Request, roles?: string[]) {
  try {
    const sig = req.get('x-component-sig');
    if (sig) {
      const { data, sig } = getVerifyData(req);
      const verified = verify(data, sig);
      return verified;
    }
    if (roles) {
      return roles.includes(req.user!.role!);
    }
  } catch (error) {
    // ignore error
  }
  return false;
}

export function ensureComponentCallOrAuth() {
  return ensureComponentCallOr(middlewares.auth());
}

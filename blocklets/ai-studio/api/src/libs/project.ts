import type Project from '@api/store/models/project';
import { fromAppDid } from '@arcblock/did-ext';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { getComponentMountPoint } from '@blocklet/aigne-sdk/utils/component';
import { env } from '@blocklet/sdk/lib/config';
import { types } from '@ocap/mcrypto';
import { joinURL, withQuery } from 'ufo';

import { wallet } from './auth';

const mountPoint: string = getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID) || '/';

export function getProjectIconUrl(
  projectId: string,
  {
    original,
    updatedAt,
  }: {
    original?: boolean;
    updatedAt?: string | number | Date;
  }
) {
  return withQuery(joinURL(env.appUrl, mountPoint || '', `/api/projects/${projectId}/logo.png`), {
    ...(original ? {} : { imageFilter: 'resize', w: 140 }),
    version: updatedAt,
  });
}

export function getProjectUrl(projectId: string) {
  return joinURL(env.appUrl, mountPoint, `/projects/${projectId}`);
}

export function getProjectDid(project: Project) {
  return fromAppDid(project.createdBy, wallet.secretKey, { role: types.RoleType.ROLE_ASSET }, 0).address;
}

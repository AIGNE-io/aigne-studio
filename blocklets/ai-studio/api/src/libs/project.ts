import type Project from '@api/store/models/project';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { getComponentMountPoint } from '@blocklet/aigne-sdk/utils/component';
import { env } from '@blocklet/sdk/lib/config';
import { fromPublicKey } from '@ocap/wallet';
import { joinURL, withQuery } from 'ufo';

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

export function getProjectDid(project: Project): string {
  return fromPublicKey(project.createdBy).address;
}

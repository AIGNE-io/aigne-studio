import { getComponentMountPoint } from '@blocklet/sdk';
import config from '@blocklet/sdk/lib/config';
import { joinURL, withQuery } from 'ufo';

import { AIGNE_STUDIO_COMPONENT_DID } from '../constants';

export function getProjectIconUrl(
  projectId: string,
  {
    blockletDid,
    original,
    projectRef,
    working,
    updatedAt,
  }: {
    blockletDid?: string;
    original?: boolean;
    projectRef?: string;
    working?: boolean;
    updatedAt?: string | number | Date;
  }
) {
  const mountPoint = getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID);

  return withQuery(joinURL(config.env.appUrl, mountPoint, `/api/projects/${projectId}/logo.png`), {
    ...(original ? {} : { imageFilter: 'resize', w: 140 }),
    version: updatedAt,
    projectRef,
    working,
    blockletDid,
  });
}

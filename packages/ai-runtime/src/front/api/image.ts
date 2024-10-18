import { createAxios } from '@blocklet/js-sdk';

import { AI_RUNTIME_DID } from '../constants';

const api = createAxios({ timeout: 120 * 1000 });

const AIGNE_RUNTIME_MOUNT_POINT =
  blocklet?.componentMountPoints.find((i) => i.did === AI_RUNTIME_DID)?.mountPoint || '/';

export async function uploadImage({ input }: { input: any }): Promise<{ uploads: Array<{ url: string }> }> {
  return api
    .post('/api/images/upload', input, {
      baseURL: AIGNE_RUNTIME_MOUNT_POINT,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => res.data);
}

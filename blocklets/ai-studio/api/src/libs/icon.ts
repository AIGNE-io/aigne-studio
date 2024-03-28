import { call } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import sample from 'lodash/sample';

import { createImageUrl } from './utils';

let icons: { filename: string }[] = [];

export async function sampleIcon() {
  if (!icons.length) {
    try {
      const params = { pageSize: 100, tags: 'default-project-icon' };
      const { data } = await call({ name: 'image-bin', path: '/api/sdk/uploads', method: 'GET', params });

      icons = data?.uploads || [];
    } catch (error) {
      // error
    }
  }

  const item = sample(icons);
  if (config.env.appUrl && item?.filename) {
    return createImageUrl(config.env.appUrl, item.filename);
  }

  return undefined;
}

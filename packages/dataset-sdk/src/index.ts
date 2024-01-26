import { components, env } from '@blocklet/sdk/lib/config';
import { joinURL } from 'ufo';

import DataServiceSDK from './sdk';
import schema from './types/check-protocol';

export * from './request';

export const getBuildInDatasets = async (origin?: string) => {
  const componentsWithUrl = components.map((component: any) => joinURL(origin || env.appUrl, component.mountPoint));

  const sdk = new DataServiceSDK(componentsWithUrl);
  const list = await sdk.mergeFindServicesResult();

  return list.filter((data) => {
    const { error } = schema.validate(data, { stripUnknown: true });

    if (error) {
      console.error(error);
    }

    return !error;
  });
};

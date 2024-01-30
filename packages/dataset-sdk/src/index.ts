import { components, env } from '@blocklet/sdk/lib/config';
import { joinURL } from 'ufo';

import DataServiceSDK from './sdk';

export * from './request';

export const getBuildInDatasets = (origin?: string) => {
  const componentsWithUrl = components.map((component: any) => joinURL(origin || env.appUrl, component.mountPoint));
  const sdk = new DataServiceSDK(componentsWithUrl);
  return sdk.getFilterList();
};

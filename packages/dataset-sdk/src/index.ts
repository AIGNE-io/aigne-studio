import { components } from '@blocklet/sdk/lib/config';
import { joinURL } from 'ufo';

import DataServiceSDK from './sdk';

export * from './request';

export const getBuildInDatasets = () => {
  const mountPoints = components.map((component: any) => joinURL(component.name));
  const sdk = new DataServiceSDK(mountPoints);
  return sdk.getFilterList();
};

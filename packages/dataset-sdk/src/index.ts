import { components } from '@blocklet/sdk/lib/config';
import { joinURL } from 'ufo';

import DataServiceSDK from './sdk';

export default {};

export const getDatasetProtocols = async (origin: string) => {
  const componentsWithUrl = components.map((component: any) => joinURL(origin, component.mountPoint));

  const sdk = new DataServiceSDK(componentsWithUrl);
  const list = await sdk.mergeFindServicesResult();

  return list;
};

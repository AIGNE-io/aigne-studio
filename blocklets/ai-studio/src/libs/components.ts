import { REMOTE_REACT_COMPONENTS } from '@blocklet/components-sdk/const';
import { RemoteComponent } from '@blocklet/components-sdk/type';
import { joinURL } from 'ufo';

import axios from './api';
import { PAGES_KIT_MOUNT_POINT } from './constants';

export interface Component {
  id: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  tags?: string[];
  properties?: {
    id: string;
    key?: string;
    type: 'string' | 'number' | 'url' | 'boolean';
    multiline?: boolean;
    locales?: {
      [locale: string]: {
        name?: string;
        defaultValue?: any;
      };
    };
  }[];

  blocklet?: { did: string };
}

export async function getComponents({
  blockletId,
  tags,
}: {
  blockletId?: string;
  tags?: string;
}): Promise<{ defaultLocale?: string; components: Component[] }> {
  return axios
    .get(joinURL('/api/components'), { baseURL: PAGES_KIT_MOUNT_POINT, params: { blockletId, tags } })
    .then((res) => res.data);
}

export async function getComponent({
  componentId,
}: {
  componentId: string;
}): Promise<{ defaultLocale?: string; component: Component }> {
  return axios.get(joinURL('/api/components', componentId), { baseURL: PAGES_KIT_MOUNT_POINT }).then((res) => res.data);
}

export async function getDynamicReactComponents(): Promise<RemoteComponent[]> {
  return axios.get(REMOTE_REACT_COMPONENTS).then((res) => res.data);
}

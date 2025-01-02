import { joinURL } from 'ufo';

import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT, PAGES_KIT_MOUNT_POINT } from './constants';
import type { RemoteComponent } from './type';

export interface Component {
  id: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  description?: string;
  tags?: string[];
  previewImage?: string;
  aigneOutputValueSchema?: Record<string, any>;
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

export async function getCustomComponents({
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

export async function getCustomComponent({
  componentId,
}: {
  componentId: string;
}): Promise<{ defaultLocale?: string; component: Component }> {
  return axios.get(joinURL('/api/components', componentId), { baseURL: PAGES_KIT_MOUNT_POINT }).then((res) => res.data);
}

export async function getOpenComponents(): Promise<RemoteComponent[]> {
  return axios
    .get('/.well-known/service/opencomponent.json', { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) =>
      Object.entries(res.data?.paths || {}).map(([, val]: [string, any]) => {
        return {
          name: val?.summary,
          description: val?.description,
          tags: val['x-tags'],
          url: val['x-path'],
          did: val['x-did'],
          parameter: {},
        };
      })
    )
    .catch(() => []);
}

export async function getComponents({ tags }: { tags: string }) {
  const [{ components: customComponents }, openComponents] = await Promise.all([
    getCustomComponents({ tags }),
    getOpenComponents().then((components) =>
      components.filter((component) => (component?.tags || []).some((tag) => tags.includes(tag)))
    ),
  ]);

  return { customComponents, openComponents };
}

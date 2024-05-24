import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import { MountPoint } from '@blocklet/sdk/lib/config';
import axios from 'axios';
import { joinURL } from 'ufo';

import { GET_SCHEMA_TIMEOUT, PROTOCOL_API } from './const';
import schema from './schema';

export default class ComponentSDK {
  private components: { componentName: string; component: MountPoint }[];

  constructor(components: { componentName: string; component: MountPoint }[]) {
    this.components = components;
  }

  private async checkService(name: string): Promise<{ name: string; url: string }[]> {
    try {
      const response = await axios({
        method: 'GET',
        url: PROTOCOL_API,
        baseURL: getComponentWebEndpoint(name),
        timeout: GET_SCHEMA_TIMEOUT,
      });

      return response.status === 200 && Array.isArray(response.data?.components) ? response.data?.components : [];
    } catch (error) {
      return [];
    }
  }

  public async mergeFindServicesResult() {
    if (this.components?.length) {
      const responses = await Promise.all(
        this.components.map((component) =>
          this.checkService(component.componentName).then((response) => ({ ...component, response }))
        )
      );

      const list = responses.flatMap(({ response, component }) =>
        (response ?? []).map((item) => ({
          path: joinURL(item.url),
          name: item.name,
          did: component.did,
          component,
        }))
      );
      return list;
    }

    return [];
  }

  public async getFilterList() {
    try {
      const list = await this.mergeFindServicesResult();

      return list.filter((data) => {
        const { error } = schema.validate(data, { stripUnknown: true });

        if (error) {
          console.error(error);
        }

        return !error;
      });
    } catch (error) {
      console.error(error?.message);
      return [];
    }
  }
}

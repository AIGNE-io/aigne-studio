import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import axios from 'axios';
import orderBy from 'lodash/orderBy';

import { OPENAPI_API } from './const';
import { DatasetObject } from './types';
import schema from './util/check-schema';

const methodOrder = ['get', 'post', 'put', 'delete'];

export default class DataServiceSDK {
  private names: string[];

  constructor(names: string[]) {
    this.names = names;
  }

  private async checkService(name: string): Promise<boolean> {
    try {
      const response = await axios({
        method: 'GET',
        url: OPENAPI_API,
        baseURL: getComponentWebEndpoint(name),
      });
      return response.status === 200 && typeof response.data === 'object';
    } catch (error) {
      return false;
    }
  }

  public async findServicesWithDataAPI(): Promise<string[]> {
    const promises: Promise<boolean>[] = this.names.map((names) => this.checkService(names));

    const results: PromiseSettledResult<boolean>[] = await Promise.allSettled(promises);

    const servicesWithDataAPI: string[] = results.reduce((acc: string[], result, index) => {
      const service = this.names[index];
      if (result.status === 'fulfilled' && result.value && service !== undefined) acc.push(service);

      return acc;
    }, []);

    return servicesWithDataAPI;
  }

  public async mergeFindServicesResult() {
    const names = await this.findServicesWithDataAPI();

    if (names?.length) {
      const responses: { name: string; data: { list: DatasetObject[] } }[] = await Promise.all(
        names.map((name) =>
          axios({
            method: 'GET',
            url: OPENAPI_API,
            baseURL: getComponentWebEndpoint(name),
          }).then((response) => ({ name, data: response.data }))
        )
      );

      return responses.flatMap(({ name, data }) => (data?.list ?? []).map((item) => ({ ...item, name })));
    }

    return [];
  }

  public async getFilterList() {
    const list = await this.mergeFindServicesResult();

    return orderBy(
      list.filter((data) => {
        const { error } = schema.validate(data, { stripUnknown: true });

        if (error) {
          console.error(error);
        }

        return !error;
      }),
      [
        (item) => {
          return methodOrder.indexOf(item.method);
        },
      ],
      ['asc']
    );
  }
}

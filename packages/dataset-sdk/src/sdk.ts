import axios from 'axios';
import { joinURL } from 'ufo';

export default class DataServiceSDK {
  private services: string[];

  constructor(services: string[]) {
    this.services = services;
  }

  private async checkService(service: string): Promise<boolean> {
    try {
      const response = await axios.get(`${service}/api/dataset/data-protocol`);
      return response.status === 200 && typeof response.data === 'object';
    } catch (error) {
      return false;
    }
  }

  public async findServicesWithDataAPI(): Promise<string[]> {
    const promises: Promise<boolean>[] = this.services.map((service) => this.checkService(service));

    const results: PromiseSettledResult<boolean>[] = await Promise.allSettled(promises);

    const servicesWithDataAPI: string[] = results.reduce((acc: string[], result, index) => {
      const service = this.services[index];
      if (result.status === 'fulfilled' && result.value && service !== undefined) acc.push(service);

      return acc;
    }, []);

    return servicesWithDataAPI;
  }

  public async mergeFindServicesResult() {
    const list = await this.findServicesWithDataAPI();

    if (list?.length) {
      const result = await Promise.all(list.map((url) => axios.get(joinURL(url, 'api/dataset/data-protocol'))));
      return result.flatMap((item) => item.data?.list);
    }

    return [];
  }
}

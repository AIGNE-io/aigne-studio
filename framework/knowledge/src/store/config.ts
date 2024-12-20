export interface StoreConfig {
  url: string;
  isDevelopment?: boolean;
}

export class Config {
  private static _instance: Config;
  private _url: string;
  private _isDevelopment: boolean;

  private constructor(config: StoreConfig) {
    this._url = config.url;
    this._isDevelopment = config.isDevelopment ?? false;
  }

  static init(config: StoreConfig) {
    if (!Config._instance) {
      Config._instance = new Config(config);
    }

    return Config._instance;
  }

  static get instance() {
    if (!Config._instance) {
      throw new Error('Store config not initialized');
    }

    return Config._instance;
  }

  get url() {
    return this._url;
  }

  get isDevelopment() {
    return this._isDevelopment;
  }
}

import { Runnable } from './runnable';

export interface Context {
  resolve<T extends Runnable>(id: string): Promise<T>;
}

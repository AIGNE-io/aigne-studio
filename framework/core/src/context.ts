import { Runnable } from './runnable';

export interface Context {
  resolveRunnable<T extends Runnable>(id: string): T;
}

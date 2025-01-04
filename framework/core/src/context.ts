import { Runnable } from './runnable';

export interface Context<State = {}> {
  state: State;

  resolve<T extends Runnable>(id: string): Promise<T>;
}

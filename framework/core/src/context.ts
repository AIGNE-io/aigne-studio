import { Runnable, RunnableDefinition } from './runnable';

export interface Context<State = {}> {
  state: State;

  resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T>;
}

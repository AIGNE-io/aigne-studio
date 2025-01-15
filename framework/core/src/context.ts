import { Runnable, RunnableDefinition } from './runnable';

export interface ContextState {
  userId?: string;
  sessionId?: string;
}

export interface Context<State extends ContextState = ContextState> {
  state: State;

  resolve<T extends Runnable>(id: string | RunnableDefinition): Promise<T>;
}

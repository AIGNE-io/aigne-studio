import { Runnable, RunnableDefinition } from './runnable';

export type RetrieveActions<T> = {
  action: 'search';
  input: {
    query: string;
    options?: {
      k?: number;
      userId?: string;
      sessionId?: string;
      filter?: { [key: string]: any };
    };
  };
  output: {
    results: T[];
  };
};

export abstract class Retrievable<T> extends Runnable<RetrieveActions<T>, RetrieveActions<T>['output']> {
  constructor(definition: RunnableDefinition & { type: 'retriever' }) {
    super(definition);
  }

  abstract search(
    query: Extract<RetrieveActions<T>, { action: 'search' }>['input']['query'],
    options?: Extract<RetrieveActions<T>, { action: 'search' }>['input']['options']
  ): Promise<Extract<RetrieveActions<T>, { action: 'search' }>['output']>;
}

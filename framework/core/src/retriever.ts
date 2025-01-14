import { Runnable, RunnableDefinition } from './runnable';

export type SearchableActions<T> = {
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

export abstract class Retriever<T> extends Runnable<SearchableActions<T>, SearchableActions<T>['output']> {
  constructor(definition: RunnableDefinition & { type: 'retriever' }) {
    super(definition);
  }

  abstract search(
    query: Extract<SearchableActions<T>, { action: 'search' }>['input']['query'],
    options?: Extract<SearchableActions<T>, { action: 'search' }>['input']['options']
  ): Promise<Extract<SearchableActions<T>, { action: 'search' }>['output']>;
}

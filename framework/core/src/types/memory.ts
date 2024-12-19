import { IDatasource } from './datasource';

export type MemoryActions<K, T> = { action: 'get'; key: K } | { action: 'set'; key: K; value: T } | { action: 'clear' };

export interface IMemory<T> extends IDatasource<MemoryActions<string, T>, T> {
  get(key: string): Promise<T | null>;

  set(key: string, value: T): Promise<T | null>;

  clear(): Promise<null>;
}

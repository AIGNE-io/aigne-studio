import { Runnable } from './runnable';

export interface IDatasourceInput {}

export interface IDatasource<I extends IDatasourceInput, T> extends Runnable<I, T> {}

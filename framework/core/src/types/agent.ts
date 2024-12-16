import { Runnable } from './runnable';

export interface IAgent<I extends { [key: string]: any }, O> extends Runnable<I, O> {}

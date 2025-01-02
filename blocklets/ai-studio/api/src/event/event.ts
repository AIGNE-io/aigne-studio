import EventEmitter from 'events';

import { PROJECT } from './project';

export const event = new EventEmitter();
export const EVENTS = {
  PROJECT,
};

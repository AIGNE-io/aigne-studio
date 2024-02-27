import path from 'path';

import config from '@blocklet/sdk/lib/config';
import Joi from 'joi';

export const Config = {
  _verbose: undefined as boolean | undefined,
  get verbose() {
    if (this._verbose === undefined) {
      this._verbose = Joi.boolean().validate(config.env.VERBOSE).value ?? false;
    }
    return this._verbose;
  },

  get dataDir() {
    return config.env.dataDir;
  },

  get uploadDir() {
    return path.join(config.env.dataDir, 'uploads');
  },
};

config.events.on(config.Events.envUpdate, () => {
  for (const key of Object.keys(Config)) {
    if (key.startsWith('_')) {
      delete (Config as any)[key];
    }
  }
});

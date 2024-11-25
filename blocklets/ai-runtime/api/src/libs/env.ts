import { join } from 'path';

import config from '@blocklet/sdk/lib/config';

export const isDevelopment = config.env.mode === 'development';

export const Config = {
  get appDir() {
    return process.env.BLOCKLET_APP_DIR!;
  },

  get dataDir() {
    return config.env.dataDir;
  },

  get uploadDir() {
    return join(config.env.dataDir, 'uploads');
  },

  get knowledgeDir() {
    return join(config.env.dataDir, 'knowledge');
  },
};

config.events.on(config.Events.envUpdate, () => {
  for (const key of Object.keys(Config)) {
    if (key.startsWith('_')) {
      delete (Config as any)[key];
    }
  }
});

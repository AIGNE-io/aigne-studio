import path from 'path';

import { broadcast } from '@api/libs/ws';
import { getServiceModePermissionMap } from '@blocklet/ai-runtime/common';
import type { ServiceMode } from '@blocklet/ai-runtime/types';
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
    return path.join(config.env.dataDir, 'uploads');
  },

  get usageReportThrottleTime() {
    return 30e3;
  },

  get serviceModePermissionMap() {
    return getServiceModePermissionMap(config.env.tenantMode as ServiceMode);
  },

  get createResourceBlockletEngineStore() {
    return process.env.CREATE_RESOURCE_BLOCKLET_ENGINE_STORE || 'https://store.blocklet.dev';
  },
};

config.events.on(config.Events.envUpdate, () => {
  for (const key of Object.keys(Config)) {
    if (key.startsWith('_')) {
      delete (Config as any)[key];
    }
  }
});

const reload = () => {
  setTimeout(() => broadcast('resourceEvent', 'component.update', { type: 'resource' }), 5000);
};

config.events.on(config.Events.componentAdded, reload);
config.events.on(config.Events.componentRemoved, reload);
config.events.on(config.Events.componentUpdated, reload);

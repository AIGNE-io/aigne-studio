import config from '@blocklet/sdk/lib/config';

import { Quotas } from '../quotas';

export const quotaChecker = new Quotas(config.env.preferences.quotas);

config.events.on(config.Events.envUpdate, () => {
  quotaChecker.setConfigs(config.env.preferences.quotas);
});

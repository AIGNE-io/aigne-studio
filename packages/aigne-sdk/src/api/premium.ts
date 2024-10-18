import config from '@blocklet/sdk/lib/config';
import AuthService from '@blocklet/sdk/lib/service/auth';

import { Quotas } from '../quotas';

export const authClient = new AuthService();

export const quotaChecker = new Quotas(config.env.preferences.quotas);

config.events.on(config.Events.envUpdate, () => {
  quotaChecker.setConfigs(config.env.preferences.quotas);
});

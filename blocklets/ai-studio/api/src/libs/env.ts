import Config from '@blocklet/sdk/lib/config';
import env from '@blocklet/sdk/lib/env';
import Joi from 'joi';

function parseDatabaseConfiguration(value: object) {
  // @ts-ignore
  value.logging = Boolean(value.logging);
  const result = Joi.object<{
    url: string;
    logging?: boolean;
    pool?: {
      max?: number;
      min?: number;
    };
  }>({
    url: Joi.string().empty([null, '']).default(`sqlite:${env.dataDir}/ai-studio.db`),
    logging: Joi.boolean().default(false),
    pool: Joi.object({
      max: Joi.number().integer().min(1).empty([null, '']),
      min: Joi.number().integer().min(0).empty([null, '']),
    }),
  }).validate(value, { stripUnknown: true });

  if (result.error) throw new Error(`validate database configuration error ${result.error.message}`);

  return result.value;
}

export default { ...env, chainHost: process.env.CHAIN_HOST || '' };

function parseConfigFromPreferences() {
  const { preferences } = Config.env;

  return {
    _database: undefined as ReturnType<typeof parseDatabaseConfiguration> | undefined,
    get database() {
      this._database ??= parseDatabaseConfiguration({
        url: preferences.database_url
          ?.replace('{password}', preferences.database_password || '')
          .replace('{env.dataDir}', env.dataDir),
        logging: preferences.database_logging === undefined ? false : preferences.database_logging,
        pool: {
          min: preferences.database_pool_min,
          max: preferences.database_pool_max,
        },
      });

      return this._database;
    },

    defaultLanguage: 'en',
  };
}

export const config = parseConfigFromPreferences();

Config.events.on('envUpdate', parseConfigFromPreferences);

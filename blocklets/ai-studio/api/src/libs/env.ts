import env from '@blocklet/sdk/lib/env';
import Joi from 'joi';

export default {
  ...env,
  chainHost: process.env.CHAIN_HOST || '',
  verbose: Joi.boolean().validate(process.env.VERBOSE).value ?? false,
};

import { didToDomain, ensureWallet } from '@blocklet/testlab/utils/wallet';
import Joi from 'joi';

const portSchema = Joi.number<number>().integer().empty(['']);

export const TestConstants = {
  headless: process.env.HEADLESS !== 'false',
  blockletCli: process.env.BLOCKLET_CLI || 'blocklet',
  serverHttpPort: (portSchema.validate(process.env.BLOCKLET_SERVER_HTTP_PORT).value as number) || 9898,
  serverHttpsPort: (portSchema.validate(process.env.BLOCKLET_SERVER_HTTPS_PORT).value as number) || 9899,

  get appUrl() {
    const wallet = ensureWallet({ name: 'app', onlyFromCache: true });
    return didToDomain({ did: wallet.address, port: TestConstants.serverHttpsPort });
  },

  authFilePath(user: string) {
    return `.playwright/.auth/${user}.json`;
  },
};

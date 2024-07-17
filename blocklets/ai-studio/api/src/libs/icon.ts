import { join } from 'path';

import { logger } from '@blocklet/sdk/lib/config';
import { pathExists, readdir, stat } from 'fs-extra';
import sample from 'lodash/sample';

import { Config } from './env';

const icons = (async () => {
  try {
    // NOTE: fix wrong path of blocklet bundle monorepo
    const imageFolderPath = join(Config.appDir, 'api/images');

    if (!(await pathExists(imageFolderPath)) || !(await stat(imageFolderPath)).isDirectory()) {
      return [];
    }

    const files = (await readdir(imageFolderPath)).filter((i) => /\.(png|jpe?g)$/.test(i));

    return files.map((i) => join(imageFolderPath, i));
  } catch (error) {
    logger.error('handle resource error', { error });
  }

  return [];
})();

export async function sampleIcon() {
  return sample(await icons);
}

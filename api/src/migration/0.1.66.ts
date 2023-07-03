import { existsSync, rmSync } from 'fs';
import { join } from 'path';

import env from '../libs/env';
import logger from '../libs/logger';
import timeMachine from '../libs/time-machine';
import { Template, templates } from '../store/templates';

const { name } = require('../../../package.json');

async function migrate() {
  const oldTimeMachineDir = join(env.dataDir, 'timemachine');

  if (existsSync(oldTimeMachineDir)) {
    rmSync(oldTimeMachineDir, { force: true, recursive: true });
  }

  if (!existsSync(timeMachine.dir)) {
    await timeMachine.init();

    for (const template of (await templates.find()) as Template[]) {
      await timeMachine.writeTemplate(template);
    }
  }
}

(async () => {
  try {
    await migrate();
    process.exit(0);
  } catch (err) {
    logger.error(`${name} migration 0.1.65 error`, err.message);
    process.exit(1);
  }
})();

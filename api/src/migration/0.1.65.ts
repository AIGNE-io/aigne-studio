import { existsSync } from 'fs';

import logger from '../libs/logger';
import { templateTimeMachineDir, writeTemplateToTimeMachine } from '../libs/time-machine';
import { Template, templates } from '../store/templates';

const { name } = require('../../../package.json');

async function migrate() {
  for (const template of (await templates.find()) as Template[]) {
    if (!existsSync(templateTimeMachineDir(template._id))) {
      await writeTemplateToTimeMachine(template, template.updatedBy);
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

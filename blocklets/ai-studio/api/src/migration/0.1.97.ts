import logger from '../libs/logger';
import { defaultModel } from '../libs/models';
import { projects } from '../store/projects';

const { name } = require('../../../package.json');

async function migrate() {
  for await (const project of await projects.cursor().exec()) {
    if (!project.model) {
      await projects.update({ _id: project._id! }, { $set: { model: defaultModel } });
    }
  }
}

(async () => {
  try {
    await migrate();
    logger.info('migration 0.1.69 success');
    process.exit(0);
  } catch (err) {
    logger.error(`${name} migration 0.1.69 error`, err);
    process.exit(1);
  }
})();

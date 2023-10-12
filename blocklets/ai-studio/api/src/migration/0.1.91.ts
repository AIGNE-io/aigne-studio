import logger from '../libs/logger';
import { Project, projects } from '../store/projects';

const { name } = require('../../../package.json');

async function migrate() {
  const list = (await projects.find()) as Project[];
  if (list.length) {
    const p: Project[] = list.map((x) => {
      return {
        ...x,
        icon: '',
        model: '',
        temperature: undefined,
        topP: undefined,
        presencePenalty: undefined,
        frequencyPenalty: undefined,
        gitType: 'default',
      };
    });
    await projects.remove({});
    await projects.insert(p);
  }
}

(async () => {
  try {
    await migrate();
    logger.info('migration 0.1.91 success');
    process.exit(0);
  } catch (err) {
    logger.error(`${name} migration 0.1.91 error`, err);
    process.exit(1);
  }
})();

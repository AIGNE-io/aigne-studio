import Cron from '@abtnode/cron';
import config from '@blocklet/sdk/lib/config';

import jobs from './jobs';

let cronJob = null as any;

const initCronJob = () => {
  if (!config.env.preferences.autoUpdateKnowledge) return () => {};

  if (!cronJob) {
    cronJob = Cron.init({
      context: {},
      jobs,
      onError: (err: Error) => {
        console.error('run job failed', err);
      },
    });
  }

  return cronJob;
};

export default initCronJob;

import Cron from '@abtnode/cron';

import jobs from './jobs';

let cronJob = null as any;

const initCronJob = () => {
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

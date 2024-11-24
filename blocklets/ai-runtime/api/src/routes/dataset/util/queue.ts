import { sha3_256 } from 'js-sha3';

import logger from '../../../libs/logger';
import createQueue from '../../../libs/queue';
import { PipelineProcessor } from '../executor';
import { sse } from '.';

export const queue = createQueue({
  options: {
    concurrency: 3,
    maxTimeout: 5 * 60 * 1000,
    id: (job) => sha3_256(JSON.stringify(job)),
  },
  onJob: async (task) => {
    const { job } = task;
    logger.info('Job Start', task);

    try {
      const pipeline = new PipelineProcessor({
        knowledgeId: job.knowledgeId,
        documentId: job.documentId,
        update: job.update,
        sse,
      });
      await pipeline.execute();
    } catch (error) {
      logger.error('Job Error', error?.message);
    }

    logger.info('Job End', task);
  },
});

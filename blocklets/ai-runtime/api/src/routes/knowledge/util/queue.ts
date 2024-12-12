import { sha3_256 } from 'js-sha3';

import logger from '../../../libs/logger';
import createQueue, { isDocumentQueue } from '../../../libs/queue';
import { PipelineProcessor } from '../executor';

export const queue = createQueue({
  options: {
    concurrency: 1,
    maxTimeout: 5 * 60 * 1000,
    id: (job) => sha3_256(JSON.stringify(job)),
  },
  onJob: async (task) => {
    const { job } = task;
    logger.debug('Job Start', task);

    if (isDocumentQueue(job)) {
      try {
        const pipeline = new PipelineProcessor({
          knowledgeId: job.knowledgeId,
          documentId: job.documentId,
          update: job.update,
        });
        await pipeline.execute();
      } catch (error) {
        logger.error('Job Error', error?.message);
      }
    }

    logger.debug('Job End', task);
  },
});

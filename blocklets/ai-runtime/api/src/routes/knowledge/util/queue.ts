import { join } from 'path';

import { pathExists } from 'fs-extra';
import { sha3_256 } from 'js-sha3';

import logger from '../../../libs/logger';
import createQueue, { isDocumentQueue, isEmbeddingSearchKitQueue } from '../../../libs/queue';
import Knowledge from '../../../store/models/dataset/dataset';
import { PipelineProcessor } from '../executor';
import SearchClient from '../retriever/meilisearch';
import { getKnowledgeVectorPath } from '.';

export const queue = createQueue({
  options: {
    concurrency: 3,
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

export const embeddingSearchKitQueue = createQueue({
  options: {
    concurrency: 3,
    maxTimeout: 5 * 60 * 1000,
    id: (job) => sha3_256(JSON.stringify(job)),
  },
  onJob: async (task) => {
    const { job } = task;
    logger.info('Embedding To Search Kit Job Start', task);

    if (isEmbeddingSearchKitQueue(job)) {
      try {
        const { from, knowledgeId, blockletDid } = job;
        const knowledge = from === 'db' ? await Knowledge.findOne({ where: { id: knowledgeId } }) : undefined;
        const vectorPath = await getKnowledgeVectorPath(blockletDid || null, knowledgeId, knowledge || undefined);

        if (vectorPath && (await pathExists(join(vectorPath, 'faiss.index')))) {
          const client = new SearchClient(knowledgeId, vectorPath);
          if (client.canUse) await client.checkUpdate();
        }
      } catch (error) {
        logger.error('Embedding Search Kit Job Error', error?.message);
      }
    }

    logger.info('Embedding To Search Kit Job End', task);
  },
});

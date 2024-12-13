import { join } from 'path';

import { pathExists } from 'fs-extra';

import SearchClient from '../../routes/knowledge/retriever/meilisearch/meilisearch';
import { getKnowledgeVectorPath } from '../../routes/knowledge/util';
import Knowledge from '../../store/models/dataset/dataset';
import logger from '../logger';

export interface PushParams {
  from: 'db' | 'resource';
  knowledgeId: string;
  blockletDid?: string;
}

const push = async ({ from, knowledgeId, blockletDid }: PushParams) => {
  try {
    if (!knowledgeId) throw new Error('Knowledge ID is required');

    const knowledge = from === 'db' ? await Knowledge.findOne({ where: { id: knowledgeId } }) : undefined;
    const vectorPath = await getKnowledgeVectorPath(blockletDid || null, knowledgeId, knowledge || undefined);
    const client = new SearchClient(knowledgeId);

    if (vectorPath && (await pathExists(join(vectorPath, 'faiss.index')))) {
      if (client.canUse) await client.checkUpdate(vectorPath);
    }
  } catch (error) {
    logger.error('push error', error);
  }
};

export default push;

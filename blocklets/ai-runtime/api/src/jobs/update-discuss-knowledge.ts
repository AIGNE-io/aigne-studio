import logger from '@api/libs/logger';
import config from '@blocklet/sdk/lib/config';

import { queue } from '../routes/knowledge/util/queue';
import Knowledge from '../store/models/dataset/dataset';
import KnowledgeDocument from '../store/models/dataset/document';

const updateDiscussKnowledge = async () => {
  if (!config.env.preferences.autoUpdateKnowledge) return;

  logger.info('action automatic update');

  const list = await Knowledge.findAll({});
  for (const knowledge of list) {
    // eslint-disable-next-line no-await-in-loop
    const documents = await KnowledgeDocument.findAll({ where: { type: 'discussKit', knowledgeId: knowledge.id } });
    documents.forEach((document) => {
      if (document.id) queue.checkAndPush({ type: 'document', knowledgeId: knowledge.id, documentId: document.id });
    });
  }
};

export default updateDiscussKnowledge;

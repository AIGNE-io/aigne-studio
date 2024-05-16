import logger from '@api/libs/logger';
import config from '@blocklet/sdk/lib/config';

import { queue } from '../routes/dataset/embeddings';
import DatasetDocument from '../store/models/dataset/document';

const updateDiscussKnowledge = async () => {
  if (!config.env.preferences.autoUpdateKnowledge) return;

  logger.info('action automatic update');

  const documents = await DatasetDocument.findAll({
    where: { type: 'discussKit' },
  });

  documents.forEach((document) => {
    if (document.id) {
      queue.checkAndPush({ type: 'document', documentId: document.id });
    }
  });
};

export default updateDiscussKnowledge;

import logger from '@api/libs/logger';
import config from '@blocklet/sdk/lib/config';

import { queue } from '../routes/dataset/util/queue';
import Dataset from '../store/models/dataset/dataset';
import DatasetDocument from '../store/models/dataset/document';

const updateDiscussKnowledge = async () => {
  if (!config.env.preferences.autoUpdateKnowledge) return;

  logger.info('action automatic update');

  const datasets = await Dataset.findAll({});
  for (const dataset of datasets) {
    const documents = await DatasetDocument.findAll({ where: { type: 'discussKit', knowledgeId: dataset.id } });
    documents.forEach((document) => {
      if (document.id) queue.checkAndPush({ type: 'document', knowledgeId: dataset.id, documentId: document.id });
    });
  }
};

export default updateDiscussKnowledge;

import { queue } from '../routes/dataset/embeddings';
import DatasetDocument from '../store/models/dataset/document';

const checkKnowledge = async () => {
  const documents = await DatasetDocument.findAll({
    where: { type: 'discussKit' },
  });

  documents.forEach((document) => {
    if (document.id) {
      queue.checkAndPush({ type: 'document', documentId: document.id });
    }
  });
};

export default checkKnowledge;

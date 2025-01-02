import { Document } from '@langchain/core/documents';

import VectorStoreFaiss from '../store/vector-store-faiss';
import { AIKitEmbeddings } from './embeddings/ai-kit';

// import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const addVectors = async (
  vectorStore: VectorStoreFaiss,
  data: string,
  id: string,
  metadata: { [key: string]: any }
) => {
  const document = new Document({ pageContent: data, metadata });

  const embeddings = new AIKitEmbeddings();
  const vectors = await embeddings.embedDocuments([JSON.stringify(document)]);

  await vectorStore.addVectors(vectors, [document], { ids: [id] });
  await vectorStore.save();
};

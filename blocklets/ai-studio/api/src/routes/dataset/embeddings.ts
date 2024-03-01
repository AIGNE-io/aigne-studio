import fs from 'fs';

import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import axios from 'axios';
import SSE from 'express-sse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import DatasetItem from '../../store/models/dataset/document';
import Segment from '../../store/models/dataset/segment';
import VectorStore from '../../store/vector-store';

const sse = new SSE();
const embeddingTasks = new Map<string, { promise: Promise<void>; current?: number; total?: number }>();

const embeddingHandler: {
  [key in NonNullable<DatasetItem['type']>]: (
    item: DatasetItem & { data: { type: key } },
    documentId: string
  ) => Promise<{ name: string; content: string }>;
} = {
  discussion: async (item: DatasetItem, documentId: string) => {
    const discussion = await getDiscussion((item.data as any).id);
    await saveContentToVectorStore(discussion.content, item.datasetId, documentId);
    return { name: discussion.title, content: discussion.content };
  },
  text: async (item: DatasetItem, documentId: string) => {
    const content = (item.data as any)?.content;
    await saveContentToVectorStore(content, item.datasetId, documentId);
    return { name: '', content };
  },
  md: async (item: DatasetItem, documentId: string) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
  txt: async (item: DatasetItem, documentId: string) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
  pdf: async (item: DatasetItem, documentId: string) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
  doc: async (item: DatasetItem, documentId: string) => {
    const content = fs.readFileSync((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
};

const discussBaseUrl = () => {
  const url = getComponentWebEndpoint('z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!url) {
    throw new Error('did-comments component not found');
  }

  return url;
};

async function getDiscussion(discussionId: string): Promise<{ content: string; updatedAt: string; title: string }> {
  const { data } = await axios.get(`/api/blogs/${discussionId}`, {
    baseURL: discussBaseUrl(),
    params: { textContent: 1 },
  });

  if (!data) {
    throw new Error('Discussion not found');
  }

  return data;
}

export const saveContentToVectorStore = async (content: string, datasetId: string, documentId: string) => {
  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.createDocuments([content]);

  for (const doc of docs) {
    // eslint-disable-next-line no-await-in-loop
    if (doc.pageContent) await Segment.create({ documentId, content: doc.pageContent });
  }

  const embeddings = new AIKitEmbeddings({});
  const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, docs);
  await store.save();
};

export const runHandlerAndSaveContent = async (itemId: string) => {
  let task = embeddingTasks.get(itemId);

  if (!task) {
    task = {
      promise: (async () => {
        const item = await DatasetItem.findOne({ where: { id: itemId } });
        if (!item) throw new Error(`Dataset item ${itemId} not found`);
        if (!item.data) return;

        const handler = embeddingHandler[item.type];
        if (!handler) return;

        try {
          const { name, content } = await handler(item as any, itemId);
          const params = name ? { error: '', content, name } : { error: '', content };

          await DatasetItem.update(params, { where: { id: itemId } });
        } catch (error) {
          await DatasetItem.update({ error: error.message }, { where: { id: itemId } });

          throw error;
        } finally {
          embeddingTasks.delete(itemId);
          sse.send({ itemId }, 'complete');
        }
      })(),
    };

    embeddingTasks.set(itemId, task);
    sse.send({ itemId }, 'change');
  }

  await task.promise;
};

export const resetDatasetsEmbedding = async (datasetId: string, did: string, itemId: string) => {
  const datasetItems = await DatasetItem.findAll({ where: { datasetId, createdBy: did } });
  if (!datasetItems?.length) return;

  await VectorStore.remove(datasetId);

  // 使用同步还是异步？
  datasetItems.forEach(async (item) => {
    const handler = embeddingHandler[item.type];
    if (!handler) return;

    // eslint-disable-next-line no-await-in-loop
    await handler(item as any, itemId);
  });
};

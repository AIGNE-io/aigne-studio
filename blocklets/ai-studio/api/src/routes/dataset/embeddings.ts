import { readFile } from 'fs/promises';

import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import axios from 'axios';
import SSE from 'express-sse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Op } from 'sequelize';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import DatasetDocument from '../../store/models/dataset/document';
import Segment from '../../store/models/dataset/segment';
import VectorStore from '../../store/vector-store';

const sse = new SSE();
const embeddingTasks = new Map<string, { promise: Promise<void>; current?: number; total?: number }>();

const embeddingHandler: {
  [key in NonNullable<DatasetDocument['type']>]: (
    item: DatasetDocument & { data: { type: key } },
    documentId: string
  ) => Promise<{ name: string; content: string } | undefined>;
} = {
  discussion: async (item: DatasetDocument, documentId: string) => {
    const discussion = await getDiscussion((item.data as any).id);
    await saveContentToVectorStore(discussion.content, item.datasetId, documentId);
    return { name: discussion?.title, content: discussion?.content };
  },
  text: async (item: DatasetDocument, documentId: string) => {
    const content = (item.data as any)?.content;
    await saveContentToVectorStore(content, item.datasetId, documentId);
    return { name: '', content };
  },
  md: async (item: DatasetDocument, documentId: string) => {
    const content = await readFile((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
  txt: async (item: DatasetDocument, documentId: string) => {
    const content = await readFile((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
  pdf: async (item: DatasetDocument, documentId: string) => {
    const content = await readFile((item.data as any).path, 'utf8');
    await saveContentToVectorStore(content, item.datasetId, documentId);

    return { name: '', content };
  },
  doc: async (item: DatasetDocument, documentId: string) => {
    const content = await readFile((item.data as any).path, 'utf8');
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

async function getDiscussion(discussionId: string): Promise<{ content: string; title: string; updatedAt: string }> {
  const { data } = await axios.get(`/api/blogs/${discussionId}`, {
    baseURL: discussBaseUrl(),
    params: { textContent: 1 },
  });
  if (!data) {
    throw new Error('Discussion not found');
  }

  return data;
}

export async function* discussionsIterator() {
  let page = 0;
  let index = 0;
  const size = 2;

  while (true) {
    page += 1;
    const { data, total } = await searchDiscussions({ page, size });

    if (!data.length) {
      break;
    }

    for (const i of data) {
      index += 1;
      yield { total, id: i.id, index };
    }
  }
}

export async function searchDiscussions({
  search,
  page,
  size,
}: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<{ data: { id: string }[]; total: number }> {
  return axios
    .get('/api/discussions', {
      baseURL: discussBaseUrl(),
      params: { page, size, search },
    })
    .then((res) => res.data);
}

export const saveContentToVectorStore = async (content: string, datasetId: string, documentId?: string) => {
  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.createDocuments([content]);

  if (documentId) {
    for (const doc of docs) {
      if (doc.pageContent) await Segment.create({ documentId, content: doc.pageContent });
    }
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
        const item = await DatasetDocument.findOne({ where: { id: itemId } });
        if (!item) throw new Error(`Dataset item ${itemId} not found`);
        if (!item.data) return;

        const handler = embeddingHandler[item.type];
        if (!handler) return;

        try {
          const result = await handler(item as any, itemId);

          if (result) {
            const { name, content } = result;
            const params = name ? { error: '', content, name } : { error: '', content };
            await DatasetDocument.update(params, { where: { id: itemId } });
          }
        } catch (error) {
          await DatasetDocument.update({ error: error.message }, { where: { id: itemId } });

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

export const resetVectorStoreEmbedding = async (datasetId: string) => {
  const datasetItems = await DatasetDocument.findAll({ where: { datasetId } });
  if (!datasetItems?.length) return;

  await VectorStore.reset(datasetId);

  const documentIds = datasetItems.map((item) => item.id);
  const segments = await Segment.findAll({ where: { documentId: { [Op.in]: documentIds } } });

  const texts = segments.map((x) => x.content).filter((i): i is NonNullable<typeof i> => !!i);
  if (texts.length === 0) return;

  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.createDocuments(texts);
  if (docs.length === 0) return;

  const embeddings = new AIKitEmbeddings({});
  const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, docs);
  await store.save();
};

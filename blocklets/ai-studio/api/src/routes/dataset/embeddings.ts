import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import axios from 'axios';
import SSE from 'express-sse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Op } from 'sequelize';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import createQueue from '../../libs/queue';
import DatasetDocument, { UploadStatus } from '../../store/models/dataset/document';
import EmbeddingHistory from '../../store/models/dataset/embedding-history';
import Segment from '../../store/models/dataset/segment';
import VectorStore from '../../store/vector-store';

export const sse = new SSE();
const embeddingTasks = new Map<string, { promise: Promise<void>; current?: number; total?: number }>();

export const queue = createQueue({
  options: {
    concurrency: 3,
    maxTimeout: 3 * 60 * 1000,
  },
  onJob: async (data) => {
    console.log(data);
  },
});

const embeddingHandler: {
  [key in NonNullable<DatasetDocument['type']>]: (item: DatasetDocument) => Promise<void>;
} = {
  discussion: async (document: DatasetDocument) => {
    const discussionId = (document.data as any).id;

    try {
      const discussion = await getDiscussion(discussionId);
      await DatasetDocument.update({ content: discussion?.content || '' }, { where: { id: document.id } });

      const previousEmbedding = await EmbeddingHistory.findOne({ where: { targetId: discussionId } });
      if (previousEmbedding?.targetVersion) {
        if (
          new Date(previousEmbedding?.targetVersion).toISOString() ===
          new Date(discussion?.updatedAt || 0).toISOString()
        ) {
          return;
        }
      }

      await saveContentToVectorStore(discussion?.content || '', document.datasetId, document.id);

      if (await EmbeddingHistory.findOne({ where: { targetId: discussionId } })) {
        await EmbeddingHistory.update(
          { targetVersion: new Date(discussion?.updatedAt || 0) },
          { where: { targetId: discussionId } }
        );
      } else {
        await EmbeddingHistory.create({ targetId: discussionId, targetVersion: new Date(discussion?.updatedAt || 0) });
      }
    } catch (error) {
      if (await EmbeddingHistory.findOne({ where: { targetId: discussionId } })) {
        await EmbeddingHistory.update({ error: error.message }, { where: { targetId: discussionId } });
      } else {
        await EmbeddingHistory.create({ targetId: discussionId, error: error.message });
      }
    }
  },
  text: async (document: DatasetDocument) => {
    await saveContentToVectorStore(document?.content || '', document.datasetId, document.id);
  },
  file: async (document: DatasetDocument) => {
    await saveContentToVectorStore(document?.content || '', document.datasetId, document.id);
  },
  fullSite: async () => {
    // await saveContentToVectorStore(document?.content || '', document.datasetId, document.id);
  },
};

const discussBaseUrl = () => {
  const url = getComponentWebEndpoint('z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!url) {
    throw new Error('did-comments component not found');
  }
  return url;
};

export async function getDiscussion(
  discussionId: string
): Promise<{ content: string; title: string; updatedAt: string } | null> {
  try {
    const { data } = await axios.get(`/api/blogs/${discussionId}`, {
      baseURL: discussBaseUrl(),
      params: { textContent: 1 },
    });

    if (!data) {
      throw new Error('Discussion not found');
    }

    return data;
  } catch (error) {
    return null;
  }
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
      yield { total, id: i.id, index, name: i.title };
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
}): Promise<{ data: { id: string; title: string }[]; total: number }> {
  return axios
    .get('/api/discussions', {
      baseURL: discussBaseUrl(),
      params: { page, size, search },
    })
    .then((res) => res.data);
}

export const saveContentToVectorStore = async (content: string, datasetId: string, documentId?: string) => {
  if (!content) return;

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

export const runHandlerAndSaveContent = async (documentId: string) => {
  let task = embeddingTasks.get(documentId);
  const item = await DatasetDocument.findOne({ where: { id: documentId } });

  if (!task) {
    task = {
      promise: (async () => {
        if (!item) throw new Error(`Dataset item ${documentId} not found`);
        if (!item.data) return;

        const handler = embeddingHandler[item.type];
        if (!handler) return;

        try {
          await item.update(
            { error: '', embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() },
            { where: { id: documentId } }
          );

          await handler(item);

          await item.update(
            { error: '', embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() },
            { where: { id: documentId } }
          );
        } catch (error) {
          console.error(error);
          await item.update(
            { error: error.message, embeddingStatus: UploadStatus.Error },
            { where: { id: documentId } }
          );
        } finally {
          await item.update({ embeddingEndAt: new Date() }, { where: { id: documentId } });
          embeddingTasks.delete(documentId);
          sse.send({ documentId, document: '' }, 'complete');
        }
      })(),
    };

    embeddingTasks.set(documentId, task);
  }

  await task.promise;
};

// 重新考虑如何处理
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

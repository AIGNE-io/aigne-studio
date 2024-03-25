import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import axios from 'axios';
import SSE from 'express-sse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Op } from 'sequelize';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import logger from '../../libs/logger';
import createQueue from '../../libs/queue';
import DatasetContent from '../../store/models/dataset/content';
import DatasetDocument, { UploadStatus } from '../../store/models/dataset/document';
import EmbeddingHistory from '../../store/models/dataset/embedding-history';
import Segment from '../../store/models/dataset/segment';
import VectorStore from '../../store/vector-store';

export const sse = new SSE();

export const queue = createQueue({
  options: {
    concurrency: 3,
    maxTimeout: 5 * 60 * 1000,
  },
  onJob: async (task) => {
    try {
      const { job } = task;
      logger.info('Job Start', task);

      const documentId = job?.documentId;
      if (!documentId) {
        throw new Error('documentId not found');
      }

      const [document, content] = await Promise.all([
        await DatasetDocument.findOne({ where: { id: documentId } }),
        await DatasetContent.findOne({ where: { documentId } }),
      ]);
      if (!document) throw new Error(`Dataset item ${documentId} not found`);
      if (!document.data) return;

      const handler = embeddingHandler[document.type];
      if (!handler) return;

      sse.send({ documentId, embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() }, 'change');

      await document.update(
        { error: '', embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() },
        { where: { id: documentId } }
      );

      await handler(document, content);

      if (document.type !== 'fullSite') {
        const result = await document.update(
          { error: '', embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() },
          { where: { id: documentId } }
        );

        sse.send({ documentId, ...result }, 'complete');
      }
    } catch (error) {
      logger.error(error?.message);
    }
  },
});

const updateEmbeddingHistory = async ({
  datasetId,
  documentId,
  targetId,
  content,
  updatedAt,
}: {
  datasetId: string;
  documentId: string;
  targetId: string;
  content?: string;
  updatedAt?: Date | string;
}) => {
  try {
    const previousEmbedding = await EmbeddingHistory.findOne({ where: { targetId } });
    if (previousEmbedding?.targetVersion && updatedAt) {
      if (
        new Date(previousEmbedding?.targetVersion).toISOString() === new Date(updatedAt || new Date()).toISOString()
      ) {
        return true;
      }
    }

    if (await EmbeddingHistory.findOne({ where: { targetId } })) {
      await EmbeddingHistory.update({ startAt: new Date(), status: UploadStatus.Uploading }, { where: { targetId } });
    } else {
      await EmbeddingHistory.create({ startAt: new Date(), status: UploadStatus.Uploading, targetId });
    }

    if (content) await saveContentToVectorStore(content, datasetId, documentId);

    if (await EmbeddingHistory.findOne({ where: { targetId } })) {
      await EmbeddingHistory.update(
        { targetVersion: new Date(updatedAt || new Date()), endAt: new Date(), status: UploadStatus.Success },
        { where: { targetId } }
      );
    } else {
      await EmbeddingHistory.create({
        targetVersion: new Date(updatedAt || new Date()),
        endAt: new Date(),
        status: UploadStatus.Success,
        targetId,
      });
    }

    return true;
  } catch (error) {
    if (await EmbeddingHistory.findOne({ where: { targetId } })) {
      await EmbeddingHistory.update({ error: error.message, status: UploadStatus.Error }, { where: { targetId } });
    } else {
      await EmbeddingHistory.create({ targetId, error: error.message, status: UploadStatus.Error });
    }

    await DatasetDocument.update(
      { error: error.message, embeddingStatus: UploadStatus.Error, embeddingEndAt: new Date() },
      { where: { id: targetId } }
    );

    return false;
  }
};

const embeddingHandler: {
  [key in NonNullable<DatasetDocument['type']>]: (
    item: DatasetDocument,
    content?: DatasetContent | null
  ) => Promise<void>;
} = {
  discussion: async (document: DatasetDocument) => {
    const targetId = (document.data as any).id;

    const discussion = await getDiscussion(targetId);
    await DatasetContent.update({ content: discussion?.content || '' }, { where: { id: document.id } });

    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId,
      updatedAt: discussion?.updatedAt,
      content: discussion?.content,
    });
  },
  text: async (document: DatasetDocument, content?: DatasetContent | null) => {
    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
    });
  },
  file: async (document: DatasetDocument, content?: DatasetContent | null) => {
    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
    });
  },
  fullSite: async (document: DatasetDocument) => {
    const documentId = document.id;
    let currentTotal = 0;
    let currentIndex = 0;

    for await (const { id: discussionId, index: current, total } of discussionsIterator()) {
      currentTotal = total;
      currentIndex++;
      sse.send({ documentId, embeddingStatus: `${current}/${total}`, embeddingEndAt: new Date() }, 'change');
      logger.info('embedding fullSite discussion', { total, current });

      try {
        const discussion = await getDiscussion(discussionId);
        // await DatasetContent.update({ content: discussion?.content || '' }, { where: { id: document.id } });

        const result = await updateEmbeddingHistory({
          datasetId: document.datasetId,
          documentId: document.id,
          targetId: discussionId,
          updatedAt: discussion?.updatedAt,
          content: discussion?.content,
        });

        if (!result) {
          currentIndex--;
        }
      } catch (error) {
        logger.error(`embedding discussion ${discussionId} error`, { error });
      }
    }

    const result = await document.update({
      embeddingStatus: `${currentIndex}/${currentTotal}`,
      embeddingEndAt: new Date(),
    });
    sse.send({ documentId, ...result }, 'complete');
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
  const size = 20;

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
    .get('/api/discussions', { baseURL: discussBaseUrl(), params: { page, size, search } })
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

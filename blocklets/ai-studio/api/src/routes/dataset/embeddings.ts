import { call } from '@blocklet/sdk/lib/component';
import SSE from 'express-sse';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { intersection } from 'lodash';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import logger from '../../libs/logger';
import createQueue from '../../libs/queue';
import DatasetContent from '../../store/models/dataset/content';
import DatasetDocument, { UploadStatus } from '../../store/models/dataset/document';
import EmbeddingHistory from '../../store/models/dataset/embedding-history';
import Segment from '../../store/models/dataset/segment';
import UpdateHistories from '../../store/models/dataset/update-history';
import VectorStoreFaiss from '../../store/vector-store-faiss';

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

      logger.info('Job End', task);
    } catch (error) {
      logger.error('Job Error', error?.message);
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
    const previousEmbedding = await EmbeddingHistory.findOne({ where: { targetId, datasetId } });
    if (previousEmbedding?.targetVersion && updatedAt) {
      if (
        new Date(previousEmbedding?.targetVersion).toISOString() === new Date(updatedAt || new Date()).toISOString()
      ) {
        return true;
      }
    }

    if (await EmbeddingHistory.findOne({ where: { targetId } })) {
      await EmbeddingHistory.update(
        { startAt: new Date(), status: UploadStatus.Uploading },
        { where: { targetId, datasetId } }
      );
    } else {
      await EmbeddingHistory.create({ startAt: new Date(), status: UploadStatus.Uploading, targetId, datasetId });
    }

    if (content) await saveContentToVectorStore(content, datasetId, documentId);

    if (await EmbeddingHistory.findOne({ where: { targetId, datasetId } })) {
      await EmbeddingHistory.update(
        { targetVersion: new Date(updatedAt || new Date()), endAt: new Date(), status: UploadStatus.Success },
        { where: { targetId, datasetId } }
      );
    } else {
      await EmbeddingHistory.create({
        targetVersion: new Date(updatedAt || new Date()),
        endAt: new Date(),
        status: UploadStatus.Success,
        targetId,
        datasetId,
      });
    }

    return true;
  } catch (error) {
    if (await EmbeddingHistory.findOne({ where: { targetId, datasetId } })) {
      await EmbeddingHistory.update(
        { error: error.message, status: UploadStatus.Error },
        { where: { targetId, datasetId } }
      );
    } else {
      await EmbeddingHistory.create({ targetId, datasetId, error: error.message, status: UploadStatus.Error });
    }

    await DatasetDocument.update(
      { error: error.message, embeddingStatus: UploadStatus.Error, embeddingEndAt: new Date() },
      { where: { id: targetId, datasetId } }
    );

    return false;
  }
};

async function updateDiscussionEmbeddings(discussionId: string, datasetId: string, documentId: string) {
  try {
    const updateEmbedding = async (locale: string, updatedAt: string, content: string) => {
      return updateEmbeddingHistory({
        datasetId,
        documentId,
        targetId: `${discussionId}-${locale}`,
        updatedAt,
        content,
      });
    };

    const discussion = await getDiscussion(discussionId);
    if (!discussion?.post) return false;

    const { post, languages = [] } = discussion;
    const isEmbed = await updateEmbedding(post.locale, post.updatedAt, post.content);

    for (const language of languages) {
      if (language !== post.locale) {
        const res = await getDiscussion(discussionId, language);
        if (res?.post) await updateEmbedding(res.post.locale, res.post.updatedAt, res.post.content);
      }
    }

    return isEmbed;
  } catch (error) {
    logger.error(`embedding discussion ${discussionId} error`, { error });
    return false;
  }
}

const embeddingHandler: {
  [key in NonNullable<DatasetDocument['type']>]: (
    item: DatasetDocument,
    content?: DatasetContent | null
  ) => Promise<void>;
} = {
  discussion: async (document: DatasetDocument) => {
    const targetId = (document.data as any).id;

    const { post: discussion } = await getDiscussion(targetId);
    await DatasetContent.update({ content: discussion?.content || '' }, { where: { id: document.id } });

    await updateDiscussionEmbeddings(targetId, document.datasetId, document.id);

    const result = await document.update(
      { error: '', embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() },
      { where: { id: document.id } }
    );
    sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
  },
  text: async (document: DatasetDocument, content?: DatasetContent | null) => {
    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
    });

    const result = await document.update(
      { error: '', embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() },
      { where: { id: document.id } }
    );
    sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
  },
  file: async (document: DatasetDocument, content?: DatasetContent | null) => {
    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
    });

    const result = await document.update(
      { error: '', embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() },
      { where: { id: document.id } }
    );
    sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
  },
  fullSite: async (document: DatasetDocument) => {
    const documentId = document.id;
    const ids = await getDiscussionIds((document.data as any).types || []);

    const currentTotal = ids.length;
    let currentIndex = 0;

    for (const discussionId of ids) {
      currentIndex++;
      sse.send(
        { documentId, embeddingStatus: `${currentIndex}/${currentTotal}`, embeddingEndAt: new Date() },
        'change'
      );
      logger.info('embedding fullSite discussion', { currentTotal, currentIndex });

      try {
        const result = await updateDiscussionEmbeddings(discussionId, document.datasetId, document.id);
        if (!result) currentIndex--;
      } catch (error) {
        logger.error(`embedding discussion ${discussionId} error`, { error });
      }
    }

    const result = await document.update({
      embeddingStatus: `${currentIndex}/${currentTotal}`,
      embeddingEndAt: new Date(),
    });
    sse.send({ documentId, ...result.dataValues }, 'complete');
  },
};

export const getDiscussionIds = async (types = ['discussion']) => {
  const ids = [];

  for (const type of types) {
    if (!type) continue;
    // eslint-disable-next-line no-await-in-loop
    for await (const { id: discussionId } of discussionsIterator(type as 'discussion' | 'blog' | 'doc')) {
      ids.push(discussionId);
    }
  }

  return [...new Set(ids)];
};

export async function getDiscussion(
  discussionId: string,
  locale?: string
): Promise<{
  post: { content: string; title: string; updatedAt: string; locale: string } | null;
  languages: string[];
}> {
  try {
    const { data } = await call({
      method: 'GET',
      name: 'did-comments',
      path: `/api/call/posts/${discussionId}`,
      params: { textContent: 1, locale },
    });

    if (!data) {
      throw new Error('Discussion not found');
    }

    return data;
  } catch (error) {
    return {
      post: null,
      languages: [],
    };
  }
}

export async function* discussionsIterator(type: 'discussion' | 'blog' | 'doc' = 'discussion') {
  let page = 0;
  let index = 0;
  const size = 20;

  while (true) {
    page += 1;
    const { data, total } = await searchDiscussions({ page, size, type });

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
  page,
  size,
  type = 'discussion',
}: {
  page?: number;
  size?: number;
  type: 'discussion' | 'blog' | 'doc';
}): Promise<{ data: { id: string; title: string }[]; total: number }> {
  return call({
    method: 'GET',
    name: 'did-comments',
    path: '/api/call/posts',
    params: { page, size, type },
  }).then((res) => res.data);
}

export const deleteStore = async (datasetId: string, ids: string[]) => {
  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStoreFaiss.load(datasetId, embeddings);

  const remoteIds = Object.values(store.getMapping()) || [];
  const deleteIds = intersection(remoteIds, ids);

  // 直接删除既可以，但这样更严谨
  if (deleteIds.length) {
    await store.delete({ ids: deleteIds });
    await store.save();
  }
};

export const updateHistoriesAndStore = async (datasetId: string, documentId: string) => {
  const { rows: messages, count } = await Segment.findAndCountAll({ where: { documentId } });
  if (count > 0) {
    const ids = messages.map((x) => x.id);
    // 仅仅做了save，没有其他地方使用,记录更新了哪些数据
    const found = await UpdateHistories.findOne({ where: { datasetId, documentId } });
    if (found) {
      await UpdateHistories.update({ segmentId: ids }, { where: { datasetId, documentId } });
    } else {
      await UpdateHistories.create({ segmentId: ids, datasetId, documentId });
    }

    await deleteStore(datasetId, ids);

    await Segment.destroy({ where: { documentId } });
  }
};

export const saveContentToVectorStore = async (content: string, datasetId: string, documentId?: string) => {
  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.createDocuments([content]);

  let ids: string[] = [];
  if (documentId) {
    await updateHistoriesAndStore(datasetId, documentId);

    const savePromises = docs.map((doc) =>
      doc.pageContent ? Segment.create({ documentId, content: doc.pageContent }) : Promise.resolve(null)
    );
    const results = await Promise.all(savePromises);
    ids = results.filter((i): i is NonNullable<typeof i> => !!i).map((result) => result?.id);
  }

  const embeddings = new AIKitEmbeddings({});
  const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));

  const store = await VectorStoreFaiss.load(datasetId, embeddings);
  await store.addVectors(vectors, docs, { ids });
  await store.save();
};

import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import SSE from 'express-sse';
import { sha3_256 } from 'js-sha3';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { intersection, isNil, omitBy } from 'lodash';
import { joinURL } from 'ufo';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import logger from '../../libs/logger';
import createQueue, {
  CommentQueue,
  EmbeddingQueue,
  FullSiteQueue,
  isCommentQueue,
  isEmbeddingQueue,
  isFullSiteQueue,
} from '../../libs/queue';
import DatasetContent from '../../store/models/dataset/content';
import DatasetDocument, { UploadStatus } from '../../store/models/dataset/document';
import EmbeddingHistories from '../../store/models/dataset/embedding-history';
import Segment from '../../store/models/dataset/segment';
import UpdateHistories from '../../store/models/dataset/update-history';
import VectorStore from '../../store/vector-store-hnswlib';

export const sse = new SSE();

const embeddingsJob = async (job: EmbeddingQueue) => {
  try {
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

    const res = await document.update({ embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() });
    sse.send({ documentId, ...res.dataValues }, 'change');

    await handler(document, content);
  } catch (error) {
    logger.error('Job Error', error?.message);
  }
};

const fullSiteItemJob = async (job: FullSiteQueue) => {
  const { documentId, currentIndex, currentTotal, discussionId } = job;
  if (!documentId) {
    throw new Error('documentId not found');
  }

  const [document] = await Promise.all([DatasetDocument.findOne({ where: { id: documentId } })]);
  if (!document) throw new Error(`Dataset item ${documentId} not found`);

  const embeddingStatus = `${currentIndex}/${currentTotal}`;
  const result = await document.update({ embeddingStatus, embeddingEndAt: new Date() });
  sse.send({ documentId, ...result.dataValues }, 'change');
  logger.info('embedding fullSite discussion', { currentTotal, currentIndex, embeddingStatus });

  try {
    await updateDiscussionEmbeddings(discussionId, document.datasetId, document.id);
  } catch (error) {
    logger.error(`embedding discussion ${discussionId} error`, { error });
  }
};

const CommentQueueJob = async (job: CommentQueue) => {
  const { documentId, discussionId, metadata } = job;

  try {
    if (!documentId) {
      throw new Error('documentId not found');
    }

    const [document] = await Promise.all([DatasetDocument.findOne({ where: { id: documentId } })]);
    if (!document) throw new Error(`Dataset item ${documentId} not found`);

    for await (const { id, content, commentAuthorName, commentCreatedAt, commentUpdatedAt } of commentsIterator(
      discussionId
    )) {
      const commentMetaData = {
        commentAuthorName,
        commentCreatedAt,
        commentUpdatedAt,
      };

      await updateEmbeddingHistory({
        datasetId: document.datasetId,
        documentId: document.id,
        targetId: id,
        updatedAt: commentUpdatedAt,
        content,
        metadata: {
          ...(metadata || {}),
          ...commentMetaData,
        },
      });
    }

    logger.info('embedding comment discussion');
  } catch (error) {
    logger.error(`embedding discussion comment ${discussionId} error`, { error });
  }
};

export const queue = createQueue({
  options: {
    concurrency: 3,
    maxTimeout: 5 * 60 * 1000,
    id: (job) => sha3_256(JSON.stringify(job)),
  },
  onJob: async (task) => {
    const { job } = task;
    logger.info('Job Start', task);

    if (isEmbeddingQueue(job)) {
      await embeddingsJob(job);
    }

    if (isFullSiteQueue(job)) {
      await fullSiteItemJob(job);
    }

    if (isCommentQueue(job)) {
      await CommentQueueJob(job);
    }

    logger.info('Job End', task);
  },
});

const updateEmbeddingHistory = async ({
  datasetId,
  documentId,
  targetId,
  content,
  metadata,
  updatedAt,
}: {
  datasetId: string;
  documentId: string;
  targetId: string;
  content?: string;
  metadata?: any;
  updatedAt?: Date | string;
}) => {
  const ids = { targetId, datasetId, documentId };
  try {
    const previousEmbedding = await EmbeddingHistories.findOne({ where: { ...ids } });
    if (previousEmbedding?.targetVersion && updatedAt) {
      if (
        new Date(previousEmbedding?.targetVersion).toISOString() === new Date(updatedAt || new Date()).toISOString()
      ) {
        return true;
      }
    }

    if (await EmbeddingHistories.findOne({ where: { ...ids } })) {
      await EmbeddingHistories.update({ startAt: new Date(), status: UploadStatus.Uploading }, { where: { ...ids } });
    } else {
      await EmbeddingHistories.create({ startAt: new Date(), status: UploadStatus.Uploading, ...ids });
    }

    if (String(content).trim()) {
      await saveContentToVectorStore({
        metadata,
        content: String(content || '').trim(),
        datasetId,
        targetId,
        documentId,
      });
    }

    if (await EmbeddingHistories.findOne({ where: { ...ids } })) {
      await EmbeddingHistories.update(
        { targetVersion: new Date(updatedAt || new Date()), endAt: new Date(), status: UploadStatus.Success },
        { where: { ...ids } }
      );
    } else {
      await EmbeddingHistories.create({
        targetVersion: new Date(updatedAt || new Date()),
        endAt: new Date(),
        status: UploadStatus.Success,
        ...ids,
      });
    }

    return true;
  } catch (error) {
    if (await EmbeddingHistories.findOne({ where: { ...ids } })) {
      await EmbeddingHistories.update({ error: error.message, status: UploadStatus.Error }, { where: { ...ids } });
    } else {
      await EmbeddingHistories.create({ error: error.message, status: UploadStatus.Error, ...ids });
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
    const updateEmbedding = async (
      locale: string,
      updatedAt: string,
      content: string,
      metadata: { [key: string]: string }
    ) => {
      const targetId = locale ? `${discussionId}_$$$_${locale}` : discussionId;

      queue.push({ type: 'comment', documentId, discussionId, metadata });

      return updateEmbeddingHistory({
        datasetId,
        documentId,
        targetId,
        updatedAt,
        content,
        metadata,
      });
    };

    const discussion = await getDiscussion(discussionId);
    if (!discussion?.post) return false;

    const { post, languages = [] } = discussion;

    const getPostLink = (type: string, locale?: string) => {
      switch (type) {
        case 'blog':
          return joinURL('blog', locale || '');
        case 'doc':
          return joinURL('docs', post.board.id, locale || '');
        case 'post':
          return 'discussions';
        default:
          return 'discussions';
      }
    };

    const link = new URL(config.env.appUrl);
    link.pathname = joinURL(getComponentMountPoint('did-comments'), getPostLink(post.type, post.locale), discussionId);

    const metadata = omitBy(
      {
        articleTitle: post.title,
        articleAuthor: post?.author?.fullName,
        articleCreatedAt: post.createdAt,
        articleUpdatedAt: post.updatedAt,
        articleBoard: post.board.title,
        articleLabels: (post.labels || []).map((x) => x.name).join(','),
        articleLink: link.href,
      },
      isNil
    );

    const isEmbed = await updateEmbedding(post.locale, post.updatedAt, post.content, metadata);

    for (const language of languages) {
      if (language !== post?.locale) {
        const res = await getDiscussion(discussionId, language);
        if (res?.post) await updateEmbedding(res.post.locale, res.post.updatedAt, res.post.content, metadata);
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
    const found = await DatasetContent.findOne({ where: { documentId: document.id } });
    if (found) {
      await found.update({ content: discussion?.content || '' });
    } else {
      await DatasetContent.create({ documentId: document.id, content: discussion?.content || '' });
    }

    await updateDiscussionEmbeddings(targetId, document.datasetId, document.id);

    const result = await document.update({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() });
    sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
  },
  text: async (document: DatasetDocument, content?: DatasetContent | null) => {
    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
      metadata: {
        title: document.name,
      },
    });

    const result = await document.update({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() });
    sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
  },
  file: async (document: DatasetDocument, content?: DatasetContent | null) => {
    await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
      metadata: {
        title: document.name,
      },
    });

    const result = await document.update({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() });
    sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
  },
  fullSite: async (document: DatasetDocument) => {
    const ids = await getDiscussionIds((document.data as any).types || []);
    const currentTotal = ids.length;
    let currentIndex = 0;

    for (const discussionId of ids) {
      currentIndex++;

      queue.push({
        type: 'fullSite',
        documentId: document.id,
        currentIndex,
        currentTotal,
        discussionId,
      });
    }
  },
};

export const getDiscussionIds = async (types: ('discussion' | 'blog' | 'doc')[] = ['discussion']) => {
  const ids = [];

  for (const type of types) {
    for await (const { id: discussionId } of discussionsIterator(type)) {
      ids.push(discussionId);
    }
  }

  return [...new Set(ids)];
};

export async function getDiscussion(
  discussionId: string,
  locale?: string
): Promise<{
  post: {
    content: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    locale: string;
    author: {
      fullName: string;
    };
    labels: { name: string }[];
    board: { title: string; desc: string; id: string };
    type: string;
  } | null;
  languages: string[];
}> {
  try {
    const result = await call({
      method: 'GET',
      name: 'did-comments',
      path: `/api/call/posts/${discussionId}`,
      params: { textContent: 1, locale },
    });

    if (!result.data) {
      throw new Error('Discussion not found');
    }

    return result.data;
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

export async function* commentsIterator(discussionId: string) {
  let page = 0;
  let index = 0;
  const size = 20;

  while (true) {
    page += 1;
    const { data } = await getDiscussionComments(discussionId, { page, size });

    if (!data.length) {
      break;
    }

    for (const i of data) {
      index += 1;
      yield {
        id: i.id,
        index,
        content: i.content,
        commentAuthorName: i.author.fullName,
        commentCreatedAt: i.createdAt,
        commentUpdatedAt: i.updatedAt,
      };
    }
  }
}

export async function getDiscussionComments(
  discussionId: string,
  {
    page,
    size,
  }: {
    page?: number;
    size?: number;
  }
): Promise<{
  data: { id: string; content: string; author: { fullName: string }; createdAt: string; updatedAt: string }[];
  total: number;
}> {
  return call({
    method: 'GET',
    name: 'did-comments',
    path: `/api/call/posts/${discussionId}/comments`,
    params: { page, size, textContent: 1 },
  }).then((res) => res.data);
}

export const deleteStore = async (datasetId: string, ids: string[]) => {
  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);

  // const remoteIds = Object.values(store.getMapping()) || [];
  const deleteIds = intersection([], ids);

  // 直接删除既可以，但这样更严谨
  if (deleteIds.length) {
    // await store.delete({ ids: deleteIds });
    await store.save();
  }
};

export const updateHistoriesAndStore = async (datasetId: string, documentId: string, targetId?: string) => {
  const where = targetId ? { documentId, targetId } : { documentId };
  const { rows: messages, count } = await Segment.findAndCountAll({ where });

  if (count > 0) {
    const ids = messages.map((x) => x.id);
    // 仅仅做了save，没有其他地方使用,记录更新了哪些数据
    const found = await UpdateHistories.findOne({ where: { datasetId, documentId } });
    if (found) {
      await UpdateHistories.update({ segmentId: ids }, { where: { datasetId, documentId } });
    } else {
      await UpdateHistories.create({ segmentId: ids, datasetId, documentId });
    }

    // await deleteStore(datasetId, ids);

    await Segment.destroy({ where });
  }
};

const saveContentToVectorStore = async ({
  metadata,
  content,
  datasetId,
  targetId = '',
  documentId,
}: {
  metadata?: any;
  content: string;
  datasetId: string;
  targetId: string;
  documentId: string;
}) => {
  const textSplitter = new RecursiveCharacterTextSplitter();
  const docs = await textSplitter.createDocuments([content], metadata ? [{ metadata }] : undefined);

  // 这个其实可以不存在
  if (metadata && typeof metadata === 'object' && Object.keys(metadata).length) {
    const arr = Object.keys(metadata)
      .map((key) => (metadata[key] ? `${key}: ${metadata[key]}` : ''))
      .filter((i) => i);

    docs.forEach((doc) => {
      arr.push(`content: ${doc.pageContent}`);
      doc.pageContent = arr.join('\n');
    });
  }

  const embeddings = new AIKitEmbeddings({});
  const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));

  // 清除历史 Vectors Store
  await updateHistoriesAndStore(datasetId, documentId, targetId);

  // 获取索引数据，保存id
  const savePromises = docs.map((doc) =>
    doc.pageContent ? Segment.create({ documentId, targetId, content: doc.pageContent }) : Promise.resolve(null)
  );
  await Promise.all(savePromises);
  // const ids = results.filter((i): i is NonNullable<typeof i> => !!i).map((result) => result?.id);

  // 保存到向量数据库
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, docs);
  await store.save();
};

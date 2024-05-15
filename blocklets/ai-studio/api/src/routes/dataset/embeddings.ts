import { readFile } from 'fs/promises';

import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import SSE from 'express-sse';
import { sha3_256 } from 'js-sha3';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { intersection, isNil, omitBy } from 'lodash';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';
import { joinURL } from 'ufo';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import logger from '../../libs/logger';
import createQueue, {
  CommentQueue,
  DiscussQueue,
  DocumentQueue,
  isCommentQueue,
  isDiscussQueue,
  isDocumentQueue,
} from '../../libs/queue';
import DatasetContent from '../../store/models/dataset/content';
import DatasetDocument, { UploadStatus } from '../../store/models/dataset/document';
import EmbeddingHistories from '../../store/models/dataset/embedding-history';
import Segment from '../../store/models/dataset/segment';
import UpdateHistories from '../../store/models/dataset/update-history';
import VectorStore from '../../store/vector-store-faiss';

export const sse = new SSE();

const handlerError = async (document: DatasetDocument, message: string) => {
  try {
    logger.error(message);
    sse.send({ documentId: document.id, embeddingStatus: UploadStatus.Error, message }, 'error');
    await document.update({ error: message, embeddingStatus: UploadStatus.Error, embeddingEndAt: new Date() });
  } catch (error) {
    logger.error(error?.message);
  }
};

function parsePDF(filePath: string): Promise<string> {
  // @ts-ignore
  const pdfParser = new PDFParser(this, 1);
  const regex = /----------------Page \(\d+\) Break----------------/g;

  return new Promise((resolve, reject) => {
    pdfParser.on('pdfParser_dataError', (errData) => reject(errData));
    pdfParser.on('pdfParser_dataReady', () => {
      const text = (pdfParser as any).getRawTextContent();
      const pages: string[] = text.split(regex);
      resolve(pages.join(','));
    });
    pdfParser.loadPDF(filePath);
  });
}

const getContent = async (fileExtension: string, filePath: string) => {
  if (!fileExtension) {
    throw new Error('Not file extension');
  }

  if (!filePath) {
    throw new Error('Not file path');
  }

  if (fileExtension === 'pdf') {
    return parsePDF(filePath);
  }

  if (fileExtension === 'doc' || fileExtension === 'docx') {
    return mammoth.extractRawText({ path: filePath }).then((result) => {
      return result.value;
    });
  }

  return readFile(filePath, 'utf8');
};

const documentItemJob = async (job: DocumentQueue) => {
  try {
    const documentId = job?.documentId;
    if (!documentId) {
      throw new Error('documentId not found');
    }

    const document = await DatasetDocument.findOne({ where: { id: documentId } });
    const content = await DatasetContent.findOne({ where: { documentId } });
    if (document?.type === 'file') {
      const data = document?.data as { type: string; path: string };
      let currentContent = '';
      try {
        currentContent = await getContent(data?.type || '', data?.path || '');
      } catch (error) {
        currentContent = '';
      }

      if (content) {
        content.content = currentContent;
      }
    }
    if (!document) throw new Error(`Dataset item ${documentId} not found`);
    if (!document.data) return;

    const handler = embeddingHandler[document.type];
    if (!handler) {
      await handlerError(document, 'no handler to embedding');
      return;
    }

    const res = await document.update({ embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() });
    sse.send({ documentId, ...res.dataValues }, 'change');

    await handler(document, content);
  } catch (error) {
    logger.error('Job Error', error?.message);
  }
};

const discussItemJob = async (job: DiscussQueue) => {
  const { documentId, currentIndex, currentTotal, discussionId } = job;
  if (!documentId) {
    throw new Error('documentId not found');
  }

  const [document] = await Promise.all([DatasetDocument.findOne({ where: { id: documentId } })]);
  if (!document) throw new Error(`Dataset item ${documentId} not found`);

  const embeddingStatus = `${currentIndex}/${currentTotal}`;
  const result = await document.update({ embeddingStatus, embeddingEndAt: new Date() });
  sse.send({ documentId, ...result.dataValues }, 'change');
  logger.info('embedding discussion data', { currentTotal, currentIndex, embeddingStatus });

  try {
    await updateDiscussionEmbeddings(discussionId, document.datasetId, document.id);
  } catch (error) {
    await handlerError(document, error?.message);
  }
};

const commentJob = async (job: CommentQueue) => {
  const { documentId, discussionId, metadata } = job;
  const document = await DatasetDocument.findOne({ where: { id: documentId } });

  try {
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
    if (document) await handlerError(document, error?.message);
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

    if (isDocumentQueue(job)) {
      await documentItemJob(job);
    }

    if (isDiscussQueue(job)) {
      await discussItemJob(job);
    }

    if (isCommentQueue(job)) {
      await commentJob(job);
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
    const previousEmbedding = await EmbeddingHistories.findOne({ where: ids });

    if (previousEmbedding?.targetVersion && updatedAt) {
      if (
        new Date(previousEmbedding?.targetVersion).toISOString() === new Date(updatedAt || new Date()).toISOString()
      ) {
        return true;
      }
    }

    const found = await EmbeddingHistories.findOne({ where: ids });
    if (found) {
      await found.update({ startAt: new Date(), status: UploadStatus.Uploading });
    } else {
      await EmbeddingHistories.create({ startAt: new Date(), status: UploadStatus.Uploading, ...ids });
    }

    const trimContent = String(content || '').trim();
    if (trimContent) {
      await saveContentToVectorStore({ metadata, content: trimContent, datasetId, documentId, targetId });
    }

    const check = await EmbeddingHistories.findOne({ where: ids });
    if (check) {
      await check.update({
        targetVersion: new Date(updatedAt || new Date()),
        endAt: new Date(),
        status: UploadStatus.Success,
      });
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
    logger.error(error?.message);
    sse.send({ documentId, embeddingStatus: UploadStatus.Error, message: error?.message }, 'error');

    const found = await EmbeddingHistories.findOne({ where: ids });
    if (found) {
      await found.update({ error: error.message, status: UploadStatus.Error });
    } else {
      await EmbeddingHistories.create({ error: error.message, status: UploadStatus.Error, ...ids });
    }

    await DatasetDocument.update(
      { error: error.message, embeddingStatus: UploadStatus.Error, embeddingEndAt: new Date() },
      { where: { id: documentId, datasetId } }
    );

    return false;
  }
};

async function updateDiscussionEmbeddings(discussionId: string, datasetId: string, documentId: string) {
  try {
    // 首先处理 discuss 当前文章数据
    // 然后处理多语言文章内容
    // 然后处理文章的评论数据
    const updateEmbedding = async (
      locale: string,
      updatedAt: string,
      content: string,
      metadata: { [key: string]: string }
    ) => {
      const targetId = locale ? `${discussionId}_$$$_${locale}` : discussionId;
      logger.log({ targetId, discussionId });
      queue.push({ type: 'comment', documentId, discussionId, metadata });
      return updateEmbeddingHistory({ datasetId, documentId, targetId, updatedAt, content, metadata });
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
        articleAuthorName: post?.author?.fullName,
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
        logger.log('embedding language discuss', { language });
        const res = await getDiscussion(discussionId, language);
        if (res?.post) await updateEmbedding(res.post.locale, res.post.updatedAt, res.post.content, metadata);
      }
    }

    return isEmbed;
  } catch (error) {
    logger.error(`embedding discussion ${discussionId} error`, { error });
    sse.send({ documentId, embeddingStatus: UploadStatus.Error, message: error?.message }, 'error');
    return false;
  }
}

const discussKitMap: {
  discussion: (document: DatasetDocument) => Promise<void>;
  board: (document: DatasetDocument) => Promise<void>;
  discussionType: (document: DatasetDocument) => Promise<void>;
} = {
  discussion: async (document) => {
    try {
      // discussId
      const targetId = (document.data as any)?.data?.id;

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
    } catch (error) {
      await handlerError(document, error?.message);
    }
  },
  board: async (document) => {
    const ids = [];
    try {
      const type = (document.data as any)?.data?.type;
      const boardId = (document.data as any)?.data?.id;

      for await (const { id: discussionId } of discussionsIterator(type, boardId)) {
        ids.push(discussionId);
      }
    } catch (error) {
      await handlerError(document, error?.message);
    }
    logger.info('board ids', ids);

    if (!ids.length) {
      await handlerError(document, 'No data to embedding');
    }

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
  discussionType: async (document) => {
    const ids = [];
    const type = (document.data as any)?.data?.id;

    try {
      for await (const { id: discussionId } of discussionsIterator(type)) {
        ids.push(discussionId);
      }
    } catch (error) {
      sse.send({ documentId: document.id, embeddingStatus: UploadStatus.Error, message: error?.message }, 'error');
      await document.update({ error: error?.message, embeddingStatus: UploadStatus.Error, embeddingEndAt: new Date() });
    }
    logger.info('type ids', { ids, type });

    if (!ids.length) {
      await handlerError(document, 'No data to embedding');
    }

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

const embeddingHandler: {
  [key in NonNullable<DatasetDocument['type']>]: (
    item: DatasetDocument,
    content?: DatasetContent | null
  ) => Promise<void>;
} = {
  // TODO: 已经废弃, discussKit包括所有 discuss 操作
  discussion: async () => {},
  // TODO: 已经废弃, discussKit包括所有 discuss 操作
  fullSite: async () => {},

  text: async (document: DatasetDocument, content?: DatasetContent | null) => {
    const embed = await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
      metadata: {
        title: document.name,
      },
    });

    if (embed) {
      const result = await document.update({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() });
      sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
    }
  },
  file: async (document: DatasetDocument, content?: DatasetContent | null) => {
    const embed = await updateEmbeddingHistory({
      datasetId: document.datasetId,
      documentId: document.id,
      targetId: document.id,
      updatedAt: content?.updatedAt,
      content: content?.content,
      metadata: {
        title: document.name,
      },
    });

    if (embed) {
      const result = await document.update({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date() });
      sse.send({ documentId: document.id, ...result.dataValues }, 'complete');
    }
  },
  discussKit: async (document: DatasetDocument) => {
    const from: 'discussion' | 'board' | 'discussionType' = (document.data as any)?.data?.from;
    const handler = discussKitMap[from];
    if (!handler) {
      await handlerError(document, 'handler is not found');
      return;
    }

    await handler(document);
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

export async function* discussionsIterator(type: 'discussion' | 'blog' | 'doc' = 'discussion', boardId?: string) {
  let page = 0;
  let index = 0;
  const size = 20;

  while (true) {
    page += 1;
    const { data, total } = await searchDiscussions({ page, size, type, boardId });

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
  boardId,
}: {
  page?: number;
  size?: number;
  type: 'discussion' | 'blog' | 'doc';
  boardId?: string;
}): Promise<{ data: { id: string; title: string }[]; total: number }> {
  return call({
    method: 'GET',
    name: 'did-comments',
    path: '/api/call/posts',
    params: { page, size, type, boardId },
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

const deleteStore = async (datasetId: string, ids: string[]) => {
  const embeddings = new AIKitEmbeddings({});
  const store = await VectorStore.load(datasetId, embeddings);

  const remoteIds = Object.values(store.getMapping()) || [];
  const deleteIds = intersection(remoteIds, ids);

  // 直接删除既可以，但这样更严谨
  if (deleteIds.length) {
    await store.delete({ ids: deleteIds });
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
      await found.update({ segmentId: ids });
    } else {
      await UpdateHistories.create({ segmentId: ids, datasetId, documentId });
    }

    await deleteStore(datasetId, ids);
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
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1024 });
  const docs = await textSplitter.createDocuments([content], metadata ? [{ metadata }] : undefined);

  const formatDocuments = docs.map((doc) => {
    if (metadata && typeof metadata === 'object' && Object.keys(metadata).length) {
      const arr = Object.keys(metadata)
        .map((key) => (metadata[key] ? `${key}: ${metadata[key]}` : ''))
        .filter((i) => i);
      arr.push(`content: ${doc.pageContent}`);

      return { ...doc, pageContent: arr.join(',') };
    }

    return doc;
  });

  const embeddings = new AIKitEmbeddings({ batchSize: 6 });
  const vectors = await embeddings.embedDocuments(formatDocuments.map((d) => d.pageContent));

  // 清除历史 Vectors Store
  await updateHistoriesAndStore(datasetId, documentId, targetId);

  // 获取索引数据，保存id
  const savePromises = formatDocuments.map((doc) =>
    doc.pageContent ? Segment.create({ documentId, targetId, content: doc.pageContent }) : Promise.resolve(null)
  );
  const results = await Promise.all(savePromises);
  const ids = results.filter((i): i is NonNullable<typeof i> => !!i).map((result) => result?.id);

  // 保存到向量数据库
  const store = await VectorStore.load(datasetId, embeddings);
  await store.addVectors(vectors, formatDocuments, { ids });
  await store.save();
};

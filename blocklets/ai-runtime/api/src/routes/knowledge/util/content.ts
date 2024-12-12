// NOTE: 目前是废弃，没有地方使用到
import { readFile } from 'fs/promises';
import { join } from 'path';

import logger from '@api/libs/logger';
import { ResourceKnowledge } from '@blocklet/ai-runtime/common/resource-manager';
import { BN, toBN } from '@ocap/util';
import mammoth from 'mammoth';
import PDFParser from 'pdf2json';

import { getUploadPathByCheckFile } from '../../../libs/ensure-dir';
import DatasetContent from '../../../store/models/dataset/content';
import KnowledgeDocument from '../../../store/models/dataset/document';
import { commentsIterator, discussionsIterator, getDiscussion } from './discuss';

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

export const getFileContent = async (fileExtension: string, filePath: string) => {
  if (!fileExtension) {
    throw new Error('Not file extension');
  }

  if (!filePath) {
    throw new Error('Not file path');
  }

  if (filePath.endsWith('.pdf')) {
    logger.debug('load parsePDF', { filePath, fileExtension });
    return parsePDF(filePath);
  }

  if (filePath.endsWith('.doc') || filePath.endsWith('.docx')) {
    logger.debug('load mammoth', { filePath, fileExtension });
    return mammoth.extractRawText({ path: filePath }).then((result) => result.value);
  }

  return readFile(filePath, 'utf8');
};

export const getTextContent = async (documentId: string) => {
  const content = await DatasetContent.findOne({ where: { documentId } });
  return content?.content || '';
};

const commentsContent = async (discussionId: string) => {
  const arr = [];
  try {
    for await (const { content } of commentsIterator(discussionId)) {
      arr.push(content);
    }
  } catch (error) {
    console.error(error?.message);
  }

  return arr.join('\n');
};

export const getDiscussionContent = async (discussionId: string) => {
  const arr = [];

  const discussion = await getDiscussion(discussionId);
  if (!discussion?.post) return '';

  const { post, languages = [] } = discussion;
  arr.push(post.content);

  for (const language of languages) {
    if (language !== post?.locale) {
      const res = await getDiscussion(discussionId, language);
      arr.push(res?.post?.content);
    }
  }

  arr.push(await commentsContent(discussionId));

  return arr.filter((x) => x).join('\n');
};

export const getDiscussionContents = async (document: KnowledgeDocument, maxLength?: BN) => {
  const arr = [];

  if (document.data && document.data.type === 'discussKit') {
    const from: 'discussion' | 'board' | 'discussionType' = (document.data as any)?.data?.from;

    if (from === 'discussion') {
      const targetId = (document.data as any)?.data?.id;
      const content = await getDiscussionContent(targetId);
      return [content];
    }

    if (from === 'board') {
      const type = (document.data as any)?.data?.type;
      const boardId = (document.data as any)?.data?.id;

      for await (const { id: discussionId } of discussionsIterator(type, boardId)) {
        const content = await getDiscussionContent(discussionId);
        arr.push(content);

        if (maxLength) {
          if (toBN(arr.join('').length || 0).gt(maxLength)) {
            throw new Error('The current document data is too large to be considered as global variables');
          }
        }
      }

      return arr;
    }

    if (from === 'discussionType') {
      const type = (document.data as any)?.data?.id;

      for await (const { id: discussionId } of discussionsIterator(type)) {
        const content = await getDiscussionContent(discussionId);
        arr.push(content);

        if (maxLength) {
          if (toBN(arr.join('').length || 0).gt(maxLength)) {
            throw new Error('The current document data is too large to be considered as global variables');
          }
        }
      }

      return arr;
    }
  }

  return [];
};

export const getContent = async (knowledgeId: string, document: KnowledgeDocument, maxLength?: BN) => {
  let content: string[] = [];
  if (document.type === 'text') {
    content = [await getTextContent(document.id)];
  } else if (document.type === 'file') {
    const data = document?.data as any;
    const fileJoinPath = await getUploadPathByCheckFile(knowledgeId, data?.path);

    content = [await getFileContent(data?.type || '', fileJoinPath)];
  } else if (document.type === 'discussKit') {
    content = await getDiscussionContents(document, maxLength);
  }
  return content;
};

const getAllContents = async (knowledgeId: string) => {
  const documents = await KnowledgeDocument.findAll({ order: [['createdAt', 'DESC']], where: { knowledgeId } });
  const docs: { title: string; content: string }[] = [];
  let maxLength = toBN('1000000'); // 100w 字段限制？？

  for (const document of documents) {
    const content = await getContent(knowledgeId, document, maxLength);

    if (toBN(content.join('').length || 0).gt(maxLength)) {
      throw new Error('The current document data is too large to be considered as global variables');
    } else {
      maxLength = maxLength.sub(toBN(content.join('').length || 0));
      if (maxLength.ltn(0)) {
        throw new Error('The current document data is too large to be considered as global variables');
      }
    }

    content.forEach((doc) => docs.push({ title: document.name || '', content: doc }));
  }

  return docs;
};

export default getAllContents;

export const getAllResourceContents = async (resource: ResourceKnowledge) => {
  const documents = resource?.documents || [];
  const docs: { title: string; content: string }[] = [];

  const getTextContent = (documentId: string) => {
    const content = (resource?.contents || [])?.find((x) => x.documentId === documentId);
    return content?.content || '';
  };

  let maxLength = toBN('1000000'); // 100w 字段限制？？
  for (const document of documents) {
    let content: string[] = [];
    try {
      if (document.type === 'text') {
        content = [getTextContent(document.id)];
      } else if (document.type === 'file') {
        const data = document?.data as { type: string; path: string };
        content = [await getFileContent(data?.type || '', join(resource.uploadPath, data?.path || ''))];
      } else if (document.type === 'discussKit') {
        content = [''];
      }
    } catch (error) {
      logger.error('get all resource contents error', { error });
      content = [];
    }

    if (toBN(content.join('').length || 0).gt(maxLength)) {
      throw new Error('The current document data is too large to be considered as global variables');
    } else {
      maxLength = maxLength.sub(toBN(content.join('').length || 0));
      if (maxLength.ltn(0)) {
        throw new Error('The current document data is too large to be considered as global variables');
      }
    }

    content.forEach((doc) => docs.push({ title: document.name || '', content: doc }));
  }

  return docs;
};

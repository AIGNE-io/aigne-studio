import { readFile, writeFile } from 'fs/promises';

import { getUploadDir } from '@api/libs/ensure-dir';
import logger from '@api/libs/logger';
import DatasetDocument from '@api/store/models/dataset/document';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import { commentsIterator, discussionsIterator, getDiscussion } from '../util';
import { BaseProcessor } from './base';

export class DiscussKitProcessor extends BaseProcessor {
  protected document: DatasetDocument;

  constructor({
    knowledgeId,
    documentId,
    sse,
    document,
  }: {
    knowledgeId: string;
    documentId: string;
    sse: any;
    document: DatasetDocument;
  }) {
    super({ knowledgeId, documentId, sse });
    this.document = document;
  }

  protected async saveOriginalFile(): Promise<void> {
    const { data } = this.document;
    if (data?.type !== 'discussKit') {
      throw new Error('document is not a discussKit');
    }

    const post = await this.getDiscussion();
    const result = stringify(post);
    const originalFilePath = joinURL(getUploadDir(this.document.datasetId), `${this.documentId}.yml`);
    await writeFile(originalFilePath, result);
    await this.document.update({ path: `${this.documentId}.yml` });
  }

  // TODO:新增一个metadata 字段，用于存储处理后的数据
  protected async ProcessedFile(): Promise<void> {
    const originalFilePath = joinURL(getUploadDir(this.document.datasetId), `${this.documentId}.yml`);
    const contents = parse((await readFile(originalFilePath)).toString());

    const array = Object.values(contents)
      .flatMap((item: any) => {
        const arr = [];

        const current = {
          locale: item.post.locale,
          title: item.post.title,
          content: item.post.content,
          comments: item.comments,
        };
        arr.push(current);

        for (const language of item.languagesResult || []) {
          const current = {
            locale: language.post.locale,
            title: language.post.title,
            content: language.post.content,
            comments: language.comments,
          };
          arr.push(current);
        }

        return arr;
      })
      .map((item) => JSON.stringify(item, null, 2));

    this.content = array.join('\n\n');
  }

  private async discussion() {
    const result: Record<string, any> = {};
    const targetId = (this.document?.data as any)?.data?.id;
    const post = await this.getDiscussionWithLanguagesAndComments(targetId);
    result[targetId] = post;

    return result;
  }

  private async board() {
    const ids = [];
    try {
      const type = (this.document.data as any)?.data?.type;
      const boardId = (this.document.data as any)?.data?.id;

      for await (const { id: discussionId } of discussionsIterator(type, boardId)) {
        ids.push(discussionId);
      }
    } catch (error) {
      logger.error('get board ids error', error);
    }

    const posts: Record<string, any> = {};
    for (const discussionId of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const post = await this.getDiscussionWithLanguagesAndComments(discussionId);
        posts[discussionId] = post;
      } catch (error) {
        logger.error('get board post error', error);
      }
    }

    return posts;
  }

  private async discussionType() {
    const ids = [];
    const type = (this.document.data as any)?.data?.id;

    try {
      for await (const { id: discussionId } of discussionsIterator(type)) {
        ids.push(discussionId);
      }
    } catch (error) {
      logger.error('get discussion type ids error', error);
    }

    const posts: Record<string, any> = {};
    for (const discussionId of ids) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const post = await this.getDiscussionWithLanguagesAndComments(discussionId);
        posts[discussionId] = post;
      } catch (error) {
        logger.error('get discussion type post error', error);
      }
    }

    return posts;
  }

  private async getDiscussion() {
    const { data } = this.document;
    if (data?.type !== 'discussKit') {
      throw new Error('document is not a discussKit');
    }

    const { data: discussData } = data;
    const from: 'discussion' | 'board' | 'discussionType' = discussData?.from;
    const discussKitMap = {
      discussion: this.discussion.bind(this),
      board: this.board.bind(this),
      discussionType: this.discussionType.bind(this),
    };

    if (!discussKitMap[from]) {
      throw new Error(`invalid discussKit from: ${from}`);
    }

    return discussKitMap[from]();
  }

  private async getDiscussionWithLanguagesAndComments(discussionId: string) {
    const discussion = await this.getDiscussionWithComments(discussionId);
    if (!discussion?.post) return {};

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

    const languagesResult = [];
    for (const language of languages) {
      if (language !== post?.locale) {
        logger.log('embedding language discuss', { language });
        // eslint-disable-next-line no-await-in-loop
        const res = await this.getDiscussionWithComments(discussionId, language);
        if (res) languagesResult.push(res);
      }
    }

    post.languagesResult = languagesResult;
    return discussion;
  }

  private async getDiscussionWithComments(discussionId: string, language?: string) {
    const comments = [];
    const discussion = await getDiscussion(discussionId, language);
    if (!discussion.post) return null;

    for await (const data of commentsIterator(discussionId)) {
      comments.push(data);
    }

    discussion.comments = comments;
    return discussion;
  }
}

import { readFile, writeFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import logger from '@api/libs/logger';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { exists } from 'fs-extra';
import { cloneDeep, omitBy } from 'lodash';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import { Discussion, commentsIterator, discussionsIterator, getDiscussion } from '../util/discuss';
import { BaseProcessor } from './base';

const commentsContent = async (discussionId: string) => {
  const arr = [];
  try {
    for await (const comment of commentsIterator(discussionId)) {
      arr.push(comment);
    }
  } catch (error) {
    console.error(error?.message);
  }

  return arr;
};

const getDiscussionContent = async (discussionId: string) => {
  const discussion = await getDiscussion(discussionId);
  if (!discussion?.post) return null;

  const { post, languages = [] } = discussion;

  const languagesResult = [];
  for (const language of languages) {
    if (language !== post?.locale) {
      // eslint-disable-next-line no-await-in-loop
      const res = await getDiscussion(discussionId, language);
      if (res?.post) languagesResult.push(res?.post);
    }
  }

  const comments = await commentsContent(discussionId);
  post.comments = comments;
  post.languagesResult = languagesResult;

  return post;
};

export class DiscussKitProcessor extends BaseProcessor {
  protected originalFileName: string = `${this.documentId}.yml`;

  protected async saveOriginalFile(): Promise<void> {
    const document = await this.getDocument();

    const { data } = document;
    if (data?.type !== 'discussKit') throw new Error('document is not discussKit data');

    const post = await this.getDiscussion();
    const result = stringify(post);
    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), this.originalFileName);
    await writeFile(originalFilePath, result);
    await document.update({ filename: this.originalFileName });
  }

  protected async ProcessedFile(): Promise<void> {
    const document = await this.getDocument();

    const { data } = document;

    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), document.filename!);
    if (!(await exists(originalFilePath))) {
      throw new Error(`processed file ${originalFilePath} not found`);
    }

    const contents = parse((await readFile(originalFilePath)).toString());
    const array = Object.values(contents)
      .flatMap((value: unknown) => {
        const { link, post } = value as { link: string; post: Discussion['post'] };
        if (!post) return [];

        const { title, content, author, labels, board, comments, languagesResult, ...rest } =
          omitBy(post, (value) => !value) || {};

        const current = {
          content: {
            title,
            content,
            author,
            labels,
            board,
            comments,
            languages: languagesResult,
          },
          metadata: {
            documentId: this.documentId,
            data: cloneDeep(data),
            title: post.title,
            locale: post.locale,
            link,
            ...rest,
          },
        };

        return current;
      })
      .map((item) => ({
        content: JSON.stringify(item.content),
        metadata: item.metadata,
      }));

    this.content = stringify(array);
  }

  private async discussion() {
    const result: Record<string, any> = {};
    const document = await this.getDocument();
    const targetId = (document.data as any)?.data?.id;
    const post = await this.getDiscussionWithLanguagesAndComments(targetId);
    result[targetId] = post;

    return result;
  }

  private async board() {
    const ids = [];
    try {
      const document = await this.getDocument();
      const type = (document.data as any)?.data?.type;
      const boardId = (document.data as any)?.data?.id;

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
    const document = await this.getDocument();
    const type = (document.data as any)?.data?.id;

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
    const document = await this.getDocument();
    const { data } = document;

    if (data?.type !== 'discussKit') throw new Error('document is not discussKit data');

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
    const post = await getDiscussionContent(discussionId);
    if (!post) return {};

    const getPostLink = (type: string, locale?: string) => {
      switch (type) {
        case 'blog':
          return joinURL('blog', locale ?? '');
        case 'doc':
          return joinURL('docs', post.board.id, locale ?? '');
        case 'post':
          return 'discussions';
        default:
          return 'discussions';
      }
    };

    const link = new URL(config.env.appUrl);
    link.pathname = joinURL(getComponentMountPoint('did-comments'), getPostLink(post.type, post.locale), discussionId);

    return { post, link };
  }
}

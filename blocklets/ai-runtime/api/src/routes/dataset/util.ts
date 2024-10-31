import { call } from '@blocklet/ai-runtime/utils/call';

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

export const getDiscussionIds = async (types: ('discussion' | 'blog' | 'doc')[] = ['discussion']) => {
  const ids = [];

  for (const type of types) {
    for await (const { id: discussionId } of discussionsIterator(type)) {
      ids.push(discussionId);
    }
  }

  return [...new Set(ids)];
};

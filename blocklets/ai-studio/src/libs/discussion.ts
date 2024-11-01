import api from './api';

const discuss = () => {
  const component = blocklet?.componentMountPoints.find((i) => i.did === 'z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!component) {
    throw new Error('did-comments component not found');
  }

  return component;
};

export const getDiscussionStatus = () => {
  try {
    // TODO: remove as any after issue fixed https://github.com/ArcBlock/blocklet-server/issues/10165
    return (discuss()?.status as any) === 'running';
  } catch (error) {
    return false;
  }
};

export interface DiscussionItem {
  id: string;
  author: {
    did: string;
    fullName: string;
  };
  boardId: string;
  commentCount: number;
  createdAt: string;
  title: string;
}

export async function searchDiscussions({
  search,
  page,
  size,
  type,
}: {
  search?: string;
  page?: number;
  size?: number;
  type?: string;
}): Promise<{ data: DiscussionItem[]; total: number }> {
  return api
    .get('/api/call/posts', {
      baseURL: discuss().mountPoint,
      params: { page, size, search, type },
    })
    .then((res) => res.data);
}

export async function discussionBoards(): Promise<{
  data: { id: string; title: string; type: 'discussion' | 'blog' | 'doc' }[];
  total: number;
}> {
  return api
    .get('/api/call/boards', {
      baseURL: discuss().mountPoint,
    })
    .then((res) => res.data);
}

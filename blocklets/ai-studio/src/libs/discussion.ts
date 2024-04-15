import api from './api';

const discuss = () => {
  const component = blocklet?.componentMountPoints.find((i) => i.did === 'z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu');
  if (!component) {
    throw new Error('did-comments component not found');
  }
  return component;
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
}: {
  search?: string;
  page?: number;
  size?: number;
}): Promise<{ data: DiscussionItem[]; total: number }> {
  return api
    .get('/api/discussions', {
      baseURL: discuss().mountPoint,
      params: { page, size, search },
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

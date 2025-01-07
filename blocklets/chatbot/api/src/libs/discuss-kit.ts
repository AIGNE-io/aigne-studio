import { config } from '@blocklet/sdk';
import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import { joinURL } from 'ufo';

export const DISCUSS_KIT_DID = 'z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu';

export async function searchDiscussKit(options: {
  q: string;
  type?: 'all' | 'discussions' | 'docs' | 'blogs' | 'bookmarks';
  sort?: 'relevance' | 'latest' | 'oldest' | 'newActivity';
  offset?: number;
  limit?: number;
  isMatchAny?: boolean;
  isInclude?: boolean;
  isExact?: boolean;
  isHybrid?: boolean;
  withComments?: boolean;
  semanticRatio?: number;
  userDid: string;
  userRole: string;
}): Promise<{
  list: { id: string; url: string; type: string; title: string; content?: string }[];
}> {
  const { data } = await call({
    name: DISCUSS_KIT_DID, // Discuss Kit Did
    method: 'GET',
    path: '/api/call/search',
    params: { ...options },
  });

  return {
    list: data.list
      .map((i: any) => ({
        id: i.id,
        type: i.type,
        cover: i.cover,
        url: joinURL(
          config.env.appUrl,
          getComponentMountPoint(DISCUSS_KIT_DID),
          DiscussionTypePrefixMap[i.type] || '',
          i.slug || i.id,
        ),
        title: i.title || i.translations?.[0]?.title,
        content: i._content || i.translations?.[0]?._content,
      }))
      .filter((i: any) => i.title),
  };
}

const DiscussionTypePrefixMap: { [key: string]: string } = {
  post: 'discussions',
  bookmark: 'bookmark',
  doc: 'docs/docs',
  blog: 'blog',
};

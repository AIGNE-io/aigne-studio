import { Deployment, ProjectStatsItem, getDeploymentsByCategorySlug } from '@app/libs/deployment';
import { User } from '@app/libs/project';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { useInfiniteScroll } from 'ahooks';
import { useEffect } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { create } from 'zustand';

import { Category } from '../../libs/category';
import { useCategoryStore } from '../../store/category-store';

interface DeploymentState {
  deployments: Record<
    string,
    {
      list: (Deployment & { project: ProjectSettings; stats: ProjectStatsItem; createdByInfo: User })[];
      next: boolean;
      size: number;
      page: number;
      total: number;
    }
  >;
  fetchDeployments: (
    categorySlug: string,
    page: number,
    size: number
  ) => Promise<{
    list: (Deployment & { project: ProjectSettings; stats: ProjectStatsItem; createdByInfo: User })[];
    next: boolean;
    size: number;
    page: number;
    total: number;
  }>;
  refreshDeployments: (categorySlug: string) => Promise<void>;
}

export const pageSize = 50;

export interface CategoryState {
  categories: Category[];
  loading?: boolean;
  error?: Error;
}

export const useCategories = () => useCategoryStore((state) => state.categories);

export const useCategoryState = () => {
  const { categories, loading, error, refetch } = useCategoryStore();

  useEffect(() => {
    refetch({ force: true });
  }, [refetch]);

  return {
    state: { categories, loading, error },
    refetch,
  };
};

export const useDeploymentsStore = create<DeploymentState>((set, get) => ({
  deployments: {},
  fetchDeployments: async (categorySlug, page, size) => {
    const { list: items, totalCount: total } = await getDeploymentsByCategorySlug({
      categorySlug,
      page,
      pageSize: size,
    });

    set((state) => ({
      deployments: {
        ...state.deployments,
        [categorySlug]: {
          list: page === 1 ? items : [...(state.deployments[categorySlug]?.list || []), ...items].filter(Boolean),
          next: items.length >= size,
          page: page + 1,
          size,
          total,
        },
      },
    }));

    return { list: items, next: items.length >= size, page: page + 1, size, total };
  },
  refreshDeployments: async (categorySlug) => {
    const currentState = get().deployments[categorySlug];

    if (currentState) {
      await get().fetchDeployments(categorySlug, 1, currentState.size);
    }
  },
}));

export const useFetchDeployments = (categorySlug?: string) => {
  const { deployments, fetchDeployments } = useDeploymentsStore();
  const currentDeploymentState = categorySlug ? deployments[categorySlug] : null;

  const dataState = useInfiniteScroll(
    async (d: { size: number; page: number } = { size: pageSize, page: 1 }) => {
      if (!categorySlug) {
        return { list: [], next: false, size: pageSize, page: 1, total: 0 };
      }

      const { page = 1, size = pageSize } = d || {};
      const result = await fetchDeployments(categorySlug, page, size);
      return result || { list: [], next: false, size, page, total: 0 };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [categorySlug] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState, currentDeploymentState };
};

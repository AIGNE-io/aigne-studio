import { Deployment, getDeploymentsByCategorySlug } from '@app/libs/deployment';
import { getProjectStats } from '@app/libs/project';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { useInfiniteScroll } from 'ahooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { create } from 'zustand';

import { Category, getCategories } from '../../libs/category';

interface DeploymentState {
  deployments: Record<
    string,
    { list: (Deployment & { project: ProjectSettings })[]; next: boolean; size: number; page: number; total: number }
  >;
  fetchDeployments: (
    categorySlug: string,
    page: number,
    size: number
  ) => Promise<{
    list: (Deployment & { project: ProjectSettings })[];
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

const categoryStates: { [key: string]: RecoilState<CategoryState> } = {};

const categoryState = () => {
  const key = 'category';

  categoryStates[key] ??= atom<CategoryState>({
    key: `categoryState-${key}`,
    default: { categories: [] },
  });

  return categoryStates[key]!;
};

export const useCategories = () => useRecoilState(categoryState())[0];

export const useCategoryState = () => {
  const [state, setState] = useRecoilState(categoryState());

  const refetch = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      let loading: boolean | undefined = false;
      setState((v) => {
        loading = v.loading;
        return { ...v, loading: true };
      });

      if (loading && !force) return;

      try {
        const categories = await getCategories({ page: 1, pageSize: 1000 });
        setState((v) => ({ ...v, categories: categories.list, error: undefined }));
      } catch (error) {
        setState((v) => ({ ...v, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, loading: false }));
      }
    },
    [setState]
  );

  useEffect(() => {
    refetch({ force: true });
  }, [refetch]);

  return {
    state,
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

type ProjectStatsItem = { id: string; totalRuns: number; totalUsers: number };

export const useProjectStats = (projectIds: string[]) => {
  const [statsList, setStatsList] = useState<ProjectStatsItem[]>([]);
  const statsMap = useMemo(
    () => statsList.reduce((acc, i) => ({ ...acc, [i.id]: i }), {} as Record<string, ProjectStatsItem>),
    [statsList]
  );

  const fetchStats = useCallback(async () => {
    if (projectIds.length === 0) return;
    const idsToFetch = projectIds.filter((id) => !statsMap[id]);
    if (idsToFetch.length === 0) return;
    try {
      const result = await getProjectStats(idsToFetch);
      setStatsList((prevStats) => [...prevStats, ...result]);
    } catch (error) {
      console.error('Failed to fetch project stats:', error);
    }
  }, [projectIds, statsMap]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, projectIds]);

  return { stats: statsMap };
};

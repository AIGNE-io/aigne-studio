import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { Category, getCategories } from '../../libs/category';

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

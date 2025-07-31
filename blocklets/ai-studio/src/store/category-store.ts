import { produce } from 'immer';
import { create } from 'zustand';

import { Category, getCategories } from '../libs/category';

export interface CategoryState {
  categories: Category[];
  loading?: boolean;
  error?: Error;
}

interface CategoryStore extends CategoryState {
  setState: (updater: (state: CategoryState) => CategoryState) => void;
  refetch: (options?: { force?: boolean }) => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>()((set) => ({
  categories: [],
  loading: false,
  setState: (updater) => set(produce((state) => updater(state))),
  refetch: async (options: { force?: boolean } = {}) => {
    const { force } = options;
    let loading: boolean | undefined = false;
    set(
      produce((state) => {
        loading = state.loading;
        state.loading = true;
      })
    );

    if (loading && !force) return;

    try {
      const categories = await getCategories({ page: 1, pageSize: 1000 });
      set((state) => ({ ...state, categories: categories.list, error: undefined }));
    } catch (error) {
      set((state) => ({ ...state, error: error as Error }));
      throw error;
    } finally {
      set(
        produce((state) => {
          state.loading = false;
        })
      );
    }
  },
}));

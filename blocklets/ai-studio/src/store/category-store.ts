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
  setState: (updater) => set(updater),
  refetch: async (options: { force?: boolean } = {}) => {
    const { force } = options;
    
    // 检查当前加载状态
    const currentState = useCategoryStore.getState();
    if (currentState.loading && !force) return;

    // 设置加载状态
    set({ loading: true });

    try {
      const categories = await getCategories({ page: 1, pageSize: 1000 });
      set({ 
        categories: categories.list, 
        error: undefined,
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error as Error,
        loading: false 
      });
      throw error;
    }
  },
}));

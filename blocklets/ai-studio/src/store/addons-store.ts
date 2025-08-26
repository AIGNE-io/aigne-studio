import { ReactNode } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export interface AddonsState {
  addons: { [key: string]: { element: ReactNode; order?: number } };
}

interface AddonsStore extends AddonsState {
  setAddon: (key: string, element?: ReactNode | null, order?: number) => void;
}

export const useAddonsStore = create<AddonsStore>()(
  immer((set) => ({
    addons: {},
    setAddon: (key, element, order) =>
      set((state) => {
        if (element) {
          state.addons[key] = { element, order };
        } else {
          delete state.addons[key];
        }
      }),
  }))
);

import { create } from 'zustand';

interface HighlightedState {
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
}

export const useHighlightedStore = create<HighlightedState>((set) => ({
  highlightedId: null,
  setHighlightedId: (id) => set({ highlightedId: id }),
}));

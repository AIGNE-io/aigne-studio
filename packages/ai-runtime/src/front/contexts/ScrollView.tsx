import { createContext, useContext } from 'react';

export interface ScrollViewContextValue {
  scroll?: 'window' | 'element';
  initialScrollBehavior?: 'auto' | 'smooth';
  component?: React.ElementType<any, keyof React.JSX.IntrinsicElements>;
}

const scrollViewContext = createContext<ScrollViewContextValue | null>(null);

export const ScrollViewProvider = scrollViewContext.Provider;

export const useScrollView = () => {
  return useContext(scrollViewContext);
};

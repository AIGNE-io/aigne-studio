import type { HistoryState } from '@lexical/react/LexicalHistoryPlugin';
import { ReactNode } from 'react';
type ContextShape = {
  historyState?: HistoryState;
};
export declare function SharedHistoryContext({ children }: { children: ReactNode }): JSX.Element;
export declare const useSharedHistoryContext: () => ContextShape;
export {};

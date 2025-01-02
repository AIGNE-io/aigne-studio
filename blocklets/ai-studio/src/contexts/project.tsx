import type { ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

export interface CurrentProjectContext {
  projectId: string;
  projectRef: string;
}

const currentProjectContext = createContext<CurrentProjectContext | undefined>(undefined);

export function CurrentProjectProvider({
  projectId,
  projectRef,
  ...props
}: {
  projectId: string;
  projectRef: string;
  children?: ReactNode;
}) {
  const value = useMemo(() => ({ projectId, projectRef }), [projectId, projectRef]);

  return <currentProjectContext.Provider value={value} {...props} />;
}

export function useCurrentProject() {
  const ctx = useContext(currentProjectContext);
  if (!ctx) throw new Error('You have to use `useCurrentProject` in the nest child of `CurrentProjectProvider`');

  return ctx;
}

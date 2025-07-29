import omitBy from 'lodash/omitBy';
import { ComponentType, ReactNode, createContext, useContext, useMemo } from 'react';

export interface ComponentPreferencesBase {
  hideInputFields?: string[];
  autoGenerate?: boolean;
  initialInputValues?: Record<string, any>;
  customOutputActionsComponent?: ComponentType<{}>;
}

const componentPreferencesContext = createContext<any>(undefined);

export function ComponentPreferencesProvider<T extends ComponentPreferencesBase>({
  children = undefined,
  ...preferences
}: { children?: ReactNode } & T) {
  const inherited = useComponentPreferences();

  const value = useMemo(
    () => ({ ...inherited, ...omitBy(preferences, (i) => i === undefined || i === null) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inherited, Object.values(preferences)]
  );

  return <componentPreferencesContext.Provider value={value}>{children}</componentPreferencesContext.Provider>;
}

export function useComponentPreferences<T>() {
  return useContext(componentPreferencesContext) as (T & ComponentPreferencesBase) | undefined;
}

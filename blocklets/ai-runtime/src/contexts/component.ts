import { useMemo } from 'react';

export function useComponent(name?: string) {
  return useMemo(() => {
    return blocklet?.componentMountPoints.find((i) => i.did === name || i.name === name);
  }, [name]);
}

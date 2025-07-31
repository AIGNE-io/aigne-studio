import { ReactNode, useEffect } from 'react';

import { useAddonsStore } from '../store/addons-store';

export const useAddon = (key: string, element: ReactNode, order?: number) => {
  const setAddon = useAddonsStore((state) => state.setAddon);

  useEffect(() => {
    setAddon(key, element, order);
    return () => setAddon(key, null);
  }, [element, key, setAddon, order]);
};

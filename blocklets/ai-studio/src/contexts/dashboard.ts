import { produce } from 'immer';
import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';

export interface AddonsState {
  addons: { [key: string]: { element: ReactNode; order?: number } };
}

const addonsState = atom<AddonsState>({
  key: 'addonsState',
  default: { addons: {} },
});

export const useAddonsState = () => useRecoilState(addonsState);

export const useAddon = (key: string, element: ReactNode, order?: number) => {
  const [, setState] = useAddonsState();

  const setAddon = useCallback(
    (key: string, element?: ReactNode | null, order?: number) => {
      setState((state) =>
        produce(state, (state) => {
          if (element) state.addons[key] = { element, order };
          else delete state.addons[key];
        })
      );
    },
    [setState]
  );

  useEffect(() => {
    setAddon(key, element, order);
    return () => setAddon(key, null);
  }, [element, key, setAddon, order]);
};

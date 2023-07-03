import produce from 'immer';
import { ReactNode, useCallback, useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';

export interface AddonsState {
  addons: { [key: string]: ReactNode };
}

const addonsState = atom<AddonsState>({
  key: 'addonsState',
  default: {
    addons: {},
  },
});

export const useAddonsState = () => useRecoilState(addonsState);

export const useAddon = (key: string, element: ReactNode) => {
  const [, setState] = useAddonsState();

  const setAddon = useCallback(
    (key: string, element?: ReactNode | null) => {
      setState((state) =>
        produce(state, (state) => {
          if (element) state.addons[key] = element;
          else delete state.addons[key];
        })
      );
    },
    [setState]
  );

  useEffect(() => {
    setAddon(key, element);
    return () => setAddon(key, null);
  }, [element, key, setAddon]);
};

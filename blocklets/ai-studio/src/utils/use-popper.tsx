import type { PopperProps } from '@mui/material';
import { ClickAwayListener, Popper } from '@mui/material';
import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';

export default function usePopper() {
  const [props, setProps] = useState<PopperProps>();

  const popper = useMemo(() => (props ? <Popper {...props} /> : null), [props]);

  const closePopper = useCallback(() => {
    setProps(undefined);
  }, []);

  const showPopper = useCallback(
    ({
      ignoreClickAwaySelector,
      ...props
    }: Omit<PopperProps, 'open' | 'children'> & { children: ReactElement; ignoreClickAwaySelector?: string }) => {
      setProps({
        ...props,
        open: true,
        sx: { zIndex: 1300, ...props.sx },
        children: (
          <ClickAwayListener
            onClickAway={(e) => {
              if (e.target === document.body) {
                return;
              }
              if (
                ignoreClickAwaySelector &&
                [...document.querySelectorAll(ignoreClickAwaySelector)].some((i) => i.contains(e.target as any))
              ) {
                return;
              }
              closePopper();
            }}>
            {props.children}
          </ClickAwayListener>
        ),
      });
    },
    [closePopper]
  );

  return { popper, showPopper, closePopper };
}

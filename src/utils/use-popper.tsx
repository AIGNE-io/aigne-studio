import { ClickAwayListener, Popper, PopperProps } from '@mui/material';
import { ReactElement, useCallback, useMemo, useState } from 'react';

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

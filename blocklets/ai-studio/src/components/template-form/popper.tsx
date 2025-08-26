import { ClickAwayListener, Popper as MuiPopper, PopperProps } from '@mui/material';
import { ReactElement } from 'react';

export default function Popper({
  onClose = undefined,
  children,
  ...props
}: { onClose?: () => void; children: ReactElement<any> } & Omit<PopperProps, 'open' | 'children'>) {
  return (
    <MuiPopper
      open={Boolean(props.anchorEl)}
      translate="no"
      transition={false}
      {...props}
      modifiers={[
        {
          name: 'preventOverflow',
          enabled: true,
          options: {
            altAxis: true,
            altBoundary: true,
            tether: true,
            rootBoundary: 'document',
            padding: 8,
          },
        },
        { name: 'offset', enabled: true, options: { offset: [0, 14] } },
        ...(props.modifiers ?? []),
      ]}
      sx={{ zIndex: (theme) => theme.zIndex.modal, ...props.sx }}>
      <ClickAwayListener
        onClickAway={(e) => {
          if (e.target === document.body) return;
          onClose?.();
        }}>
        {children}
      </ClickAwayListener>
    </MuiPopper>
  );
}

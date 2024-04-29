import {
  Box,
  BoxProps,
  Button,
  ButtonProps,
  ClickAwayListener,
  MenuList,
  Paper,
  Popper,
  PopperProps,
  menuItemClasses,
} from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { ReactNode } from 'react';

export default function PopperMenu({
  children,
  ButtonProps,
  BoxProps,
  PopperProps,
}: {
  children?: ReactNode;
  ButtonProps?: ButtonProps;
  BoxProps?: BoxProps;
  PopperProps?: Partial<PopperProps>;
}) {
  const state = usePopupState({ variant: 'popper' });

  return (
    <>
      {BoxProps ? <Box {...BoxProps} {...bindTrigger(state)} /> : <Button {...ButtonProps} {...bindTrigger(state)} />}

      <Popper
        {...bindPopper(state)}
        {...PopperProps}
        sx={{
          zIndex: 'modal',
          [`.${menuItemClasses.root}`]: {
            borderRadius: 1,
          },
          ...PopperProps?.sx,
        }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            state.close();
          }}>
          <Paper>
            <MenuList onClick={state.close}>{children}</MenuList>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

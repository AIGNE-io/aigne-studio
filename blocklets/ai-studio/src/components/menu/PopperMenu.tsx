import {
  Box,
  BoxProps,
  Button,
  ButtonProps,
  ClickAwayListener,
  MenuList,
  Paper,
  Popper,
  menuItemClasses,
} from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { ReactNode } from 'react';

export default function PopperMenu({
  children,
  ButtonProps,
  BoxProps,
}: {
  children?: ReactNode;
  ButtonProps?: ButtonProps;
  BoxProps?: BoxProps;
}) {
  const state = usePopupState({ variant: 'popper' });

  return (
    <>
      {BoxProps ? <Box {...BoxProps} {...bindTrigger(state)} /> : <Button {...ButtonProps} {...bindTrigger(state)} />}

      <Popper
        {...bindPopper(state)}
        sx={{
          zIndex: 'modal',
          [`.${menuItemClasses.root}`]: {
            borderRadius: 1,
          },
        }}>
        <ClickAwayListener onClickAway={state.close}>
          <Paper>
            <MenuList onClick={state.close}>{children}</MenuList>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

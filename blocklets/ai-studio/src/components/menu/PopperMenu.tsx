import type { BoxProps, ButtonProps, PopperProps } from '@mui/material';
import { Box, Button, ClickAwayListener, MenuList, Paper, Popper, menuItemClasses } from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import type { ReactNode } from 'react';
import { forwardRef, useImperativeHandle } from 'react';

export interface PopperMenuImperative {
  open: () => void;
  close: () => void;
}

const PopperMenu = forwardRef<
  PopperMenuImperative,
  {
    children?: ReactNode;
    ButtonProps?: ButtonProps;
    BoxProps?: BoxProps;
    PopperProps?: Partial<PopperProps>;
  }
>(({ children, ButtonProps, BoxProps, PopperProps }, ref) => {
  const state = usePopupState({ variant: 'popper' });

  useImperativeHandle(ref, () => ({ open: state.open, close: state.close }), [state]);

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
});

export default PopperMenu;

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
import { ReactNode, useImperativeHandle } from 'react';

export interface PopperMenuImperative {
  open: () => void;
  close: () => void;
}

const PopperMenu = ({
  ref,
  children,
  ButtonProps,
  BoxProps,
  PopperProps,
}: {
  children?: ReactNode;
  ButtonProps?: ButtonProps;
  BoxProps?: BoxProps;
  PopperProps?: Partial<PopperProps>;
} & {
  ref?: React.Ref<PopperMenuImperative>;
}) => {
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
};

export default PopperMenu;

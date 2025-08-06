import {
  Box,
  BoxProps,
  Button,
  ClickAwayListener,
  Grow,
  List,
  Paper,
  Popper,
  PopperProps,
  listItemIconClasses,
} from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import React, { ReactNode, isValidElement } from 'react';

export default function PopperMenuButton({
  PopperProps,
  menus = undefined,
  ...props
}: { PopperProps: Omit<PopperProps, 'open'>; menus?: ReactNode } & BoxProps<typeof Button>) {
  const state = usePopupState({ variant: 'popper' });

  return (
    <>
      <Box
        component={Button}
        onClick={(e: any) => {
          e.stopPropagation();
          bindTrigger(state).onClick(e);
        }}
        {...props}
      />

      <Popper transition {...PopperProps} {...bindPopper(state)}>
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={() => state.close()}>
            <Grow {...TransitionProps}>
              <Paper>
                <List
                  dense
                  sx={{
                    [`.${listItemIconClasses.root}`]: {
                      minWidth: 24,
                    },
                  }}>
                  {React.Children.map(menus, (menu) =>
                    !isValidElement(menu)
                      ? menu
                      : React.cloneElement(menu, {
                          onClick: async (...args: any[]) => {
                            // @ts-ignore
                            await menu.props.onClick?.(...args);
                            state.close();
                          },
                        } as any)
                  )}
                </List>
              </Paper>
            </Grow>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
}

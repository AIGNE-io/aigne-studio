import Header from '@blocklet/ui-react/lib/Header';
import { Box, BoxProps, Stack } from '@mui/material';
import { ReactNode } from 'react';

export interface DashboardProps {
  HeaderProps?: {
    logo?: ReactNode;
    brand?: ReactNode;
    description?: ReactNode;
    brandAddon?: ReactNode;
    addons?: ReactNode | ((builtin: ReactNode[]) => ReactNode[] | ReactNode);
    sx?: BoxProps['sx'];
  };
  ContentProps?: BoxProps;
  FooterProps?: BoxProps;
  menus?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

const menuBarWidth = 72;

export default function Dashboard({ HeaderProps, ContentProps, FooterProps, menus, children, footer }: DashboardProps) {
  const hasMenus = !!menus;

  return (
    <Stack sx={{ height: '100%' }}>
      <Box height={64} flexShrink={0}>
        <Box
          component={Header}
          {...HeaderProps}
          sx={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            '.header-container': {
              maxWidth: 'none',
              paddingLeft: 0,
              '.header-brand-wrapper': hasMenus
                ? {
                    width: menuBarWidth,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '.header-logo': {
                      mr: 0,
                    },
                  }
                : undefined,
            },
            ...HeaderProps?.sx,
          }}
        />
      </Box>

      {hasMenus && (
        <Box
          sx={{
            position: 'fixed',
            top: 64,
            left: 0,
            bottom: 0,
            width: menuBarWidth,
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            overflow: 'hidden auto',
            '::-webkit-scrollbar': {
              display: 'none',
            },
          }}>
          {menus}
        </Box>
      )}

      <Stack
        component="main"
        {...ContentProps}
        sx={{
          flexGrow: 1,
          ml: hasMenus ? `${menuBarWidth}px` : 0,
          ...ContentProps?.sx,
        }}>
        {children}
      </Stack>

      {footer && (
        <Box
          {...FooterProps}
          sx={{
            ml: hasMenus ? `${menuBarWidth}px` : 0,
            ...FooterProps?.sx,
          }}>
          {footer}
        </Box>
      )}
    </Stack>
  );
}

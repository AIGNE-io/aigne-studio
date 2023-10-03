import Header from '@blocklet/ui-react/lib/Header';
import { MenuOpenRounded, MenuRounded } from '@mui/icons-material';
import {
  Box,
  BoxProps,
  Drawer,
  DrawerProps,
  IconButton,
  Stack,
  Theme,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactElement, ReactNode, cloneElement, useMemo, useState } from 'react';

export interface DashboardProps {
  HeaderProps?: {
    prepend?: ReactNode;
    logo?: ReactNode;
    brand?: ReactNode;
    description?: ReactNode;
    brandAddon?: ReactNode;
    addons?: ReactNode | ((builtin: ReactNode[]) => ReactNode[] | ReactNode);
    sx?: BoxProps['sx'];
  };
  ContentProps?: BoxProps;
  FooterProps?: BoxProps;
  menus?: ReactElement<{ collapsed?: boolean; onClick?: () => void }> | null;
  children?: ReactNode;
  footer?: ReactNode;
  collapseBreakpoint?: 'sm' | 'md';
}

const miniDrawerWidth = 87;
const drawerWidth = 200;

export default function Dashboard({
  HeaderProps,
  ContentProps,
  FooterProps,
  menus,
  children,
  footer,
  collapseBreakpoint = 'md',
}: DashboardProps) {
  const theme = useTheme();

  const isPermanent = useMediaQuery(theme.breakpoints.up(collapseBreakpoint));

  const [permanentOpen, setPermanentOpen] = useState(false);
  const [temporaryOpen, setTemporaryOpen] = useState(false);

  const open = isPermanent ? permanentOpen : temporaryOpen;
  const setOpen = useMemo(
    () => (isPermanent ? setPermanentOpen : setTemporaryOpen),
    [isPermanent, setPermanentOpen, setTemporaryOpen]
  );

  const isMiniMenu = !open && isPermanent;

  return (
    <Root sx={{ height: '100%' }}>
      <Box component="header">
        <Box
          {...HeaderProps}
          component={Header}
          prepend={
            <>
              {isPermanent ? null : (
                <IconButton sx={{ mr: 1 }} onClick={() => setOpen(!open)}>
                  {open ? <MenuOpenRounded /> : <MenuRounded />}
                </IconButton>
              )}

              {HeaderProps?.prepend}
            </>
          }
        />
      </Box>

      <Box height={64} flexShrink={0} />

      <Stack flex={1} direction="row">
        <Box
          sx={{
            flexShrink: 0,
            width: { [collapseBreakpoint]: open ? drawerWidth : miniDrawerWidth },
            transition: (theme) => transition(theme, 'width', open),
          }}>
          <MenusDrawer
            variant={isPermanent ? 'permanent' : 'temporary'}
            open={open}
            collapsed={isMiniMenu}
            onClose={() => setOpen(false)}>
            {menus &&
              cloneElement(menus, {
                collapsed: isMiniMenu,
                onClick: isPermanent ? undefined : () => setOpen(false),
              })}
          </MenusDrawer>
        </Box>

        <Stack flex={1}>
          <Stack
            component="main"
            {...ContentProps}
            sx={{
              flexGrow: 1,
              ...ContentProps?.sx,
            }}>
            {children}
          </Stack>

          {footer && (
            <Box {...FooterProps} component="footer">
              {footer}
            </Box>
          )}
        </Stack>
      </Stack>
    </Root>
  );
}

const Root = styled(Stack)`
  > header {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    z-index: ${({ theme }) => theme.zIndex.appBar + 2};
    border-bottom: ${({ theme }) => `1px solid ${theme.palette.grey[200]}`};

    .header-container {
      max-width: none;
    }
  }
`;

const transition = (theme: Theme, props: string | string[], open?: boolean) =>
  theme.transitions.create(props, {
    easing: theme.transitions.easing.sharp,
    duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
  });

function MenusDrawer({ collapsed, ...props }: DrawerProps & { collapsed?: boolean }) {
  return (
    <Drawer
      {...props}
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
      PaperProps={{
        sx: {
          width: collapsed ? miniDrawerWidth : drawerWidth,
          transition: (theme) => transition(theme, 'width', props.open),
          borderRightStyle: props.variant === 'permanent' ? 'solid' : 'none',
          borderRightColor: (theme) => theme.palette.grey[200],
          zIndex: (theme) => theme.zIndex.appBar + 1,

          '*::-webkit-scrollbar': {
            display: 'none',
          },
        },
      }}>
      <Box height={64} flexShrink={0} />

      {props.children}
    </Drawer>
  );
}

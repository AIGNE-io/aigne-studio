// @ts-ignore
import useBrowser from '@arcblock/react-hooks/lib/useBrowser';
import Header from '@blocklet/ui-react/lib/Header';
import { MenuOpenRounded, MenuRounded } from '@mui/icons-material';
import {
  Box,
  Drawer,
  DrawerProps,
  IconButton,
  Stack,
  StackProps,
  Theme,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ReactElement, ReactNode, cloneElement, useMemo, useState } from 'react';

export interface DashboardProps extends StackProps {
  HeaderProps?: {
    prepend?: ReactNode;
    logo?: ReactNode;
    brand?: ReactNode;
    description?: ReactNode;
    brandAddon?: ReactNode;
    addons?: ReactNode | ((builtin: ReactNode[]) => ReactNode[] | ReactNode);
    homeLink?: string;
  };
  MenusDrawerProps?: DrawerProps;
  menus?: ReactElement<{ collapsed?: boolean; onClick?: () => void }> | null;
  children?: ReactNode;
  collapseBreakpoint?: 'sm' | 'md';
}

const miniDrawerWidth = 87;
const drawerWidth = 300;

export default function Dashboard({
  HeaderProps = undefined,
  MenusDrawerProps = undefined,
  menus = undefined,
  children = undefined,
  collapseBreakpoint = 'md',
  ...props
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
  const browser = useBrowser();
  const isArcSphere = browser?.arcSphere ?? false;

  return (
    <Root {...props} sx={{ height: '100%', pt: isArcSphere ? 0 : 8, ...props.sx }}>
      <Box className="dashboard-header" component="header">
        <Header
          className="blocklet-header"
          theme={theme}
          {...HeaderProps}
          // @ts-ignore
          prepend={
            menus && (
              <>
                {isPermanent ? null : (
                  <IconButton sx={{ mr: 1 }} onClick={() => setOpen(!open)}>
                    {open ? <MenuOpenRounded /> : <MenuRounded />}
                  </IconButton>
                )}
                {HeaderProps?.prepend}
              </>
            )
          }
        />
      </Box>

      <Stack className="dashboard-body" direction="row" sx={{ height: '100%' }}>
        {menus && (
          <Box
            className="dashboard-aside"
            sx={{
              height: '100%',
              flexShrink: 0,
              width: { [collapseBreakpoint]: open ? drawerWidth : miniDrawerWidth },
              transition: (theme) => transition(theme, 'width', open),
            }}>
            <MenusDrawer
              {...MenusDrawerProps}
              variant={isPermanent ? 'permanent' : 'temporary'}
              open={open}
              collapsed={isMiniMenu}
              onClose={() => setOpen(false)}>
              {cloneElement(menus, {
                collapsed: isMiniMenu,
                onClick: isPermanent ? undefined : () => setOpen(false),
              })}
            </MenusDrawer>
          </Box>
        )}

        <Stack className="dashboard-content" sx={{ height: '100%', flex: 1 }}>
          {children}
        </Stack>
      </Stack>
    </Root>
  );
}

const Root = styled(Stack)`
  > .dashboard-header {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    z-index: ${({ theme }) => theme.zIndex.appBar + 2};
    border-bottom: ${({ theme }) => `1px solid ${theme.palette.grey[200]}`};
    background-color: ${({ theme }) => theme.palette.background.paper};

    .blocklet-header {
      background-color: transparent;
    }

    .header-container {
      max-width: none;

      .header-addons {
      }
    }
  }
`;

const transition = (theme: Theme, props: string | string[], open?: boolean) =>
  theme.transitions.create(props, {
    easing: theme.transitions.easing.sharp,
    duration: open ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
  });

function MenusDrawer({ collapsed = undefined, ...props }: DrawerProps & { collapsed?: boolean }) {
  return (
    <Drawer
      {...props}
      sx={{ height: '100%', zIndex: (theme) => theme.zIndex.appBar + 1, ...props.sx }}
      slotProps={{
        paper: {
          ...props.PaperProps,
          sx: {
            top: 64,
            bottom: 0,
            height: 'auto',
            width: collapsed ? miniDrawerWidth : drawerWidth,
            transition: (theme) => transition(theme, 'width', props.open),
            borderRightWidth: props.variant === 'permanent' ? 1 : 0,
            borderRightStyle: props.variant === 'permanent' ? 'solid' : 'none',
            borderRightColor: (theme) => (props.variant === 'permanent' ? theme.palette.grey[200] : 'transparent'),
            zIndex: (theme) => theme.zIndex.appBar + 1,
            boxShadow: 0,

            '*::-webkit-scrollbar': {
              display: 'none',
            },

            ...props.PaperProps?.sx,
          },
        },
      }}>
      {props.children}
    </Drawer>
  );
}

import { cx } from '@emotion/css';
import { Box, BoxProps, Drawer, backdropClasses, styled, useMediaQuery, useTheme } from '@mui/material';
import { ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export interface ImperativeColumnsLayout {
  collapseLeft: () => void;
  expandLeft: () => void;
  collapseRight: () => void;
  expandRight: () => void;
}

const ColumnsLayout = ({
  ref,
  onLeftCollapse = undefined,
  onRightCollapse = undefined,
  ...props
}: {
  left?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
  right?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
  children?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
  onLeftCollapse?: (collapsed: boolean) => void;
  onRightCollapse?: (collapsed: boolean) => void;
} & {
  ref: React.RefObject<ImperativeColumnsLayout | null>;
}) => {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const leftPanel = useRef<ImperativePanelHandle>(undefined);
  const rightPanel = useRef<ImperativePanelHandle>(undefined);

  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    if (isLargeScreen) {
      if (leftDrawerOpen) setTimeout(() => leftPanel.current?.expand());
      if (rightDrawerOpen) setTimeout(() => rightPanel.current?.expand());

      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    }
  }, [isLargeScreen]);

  useImperativeHandle(
    ref,
    () => ({
      collapseLeft: () => (isLargeScreen ? leftPanel.current?.collapse() : setLeftDrawerOpen(false)),
      expandLeft: () => (isLargeScreen ? leftPanel.current?.expand() : setLeftDrawerOpen(true)),
      collapseRight: () => (isLargeScreen ? rightPanel.current?.collapse() : setRightDrawerOpen(false)),
      expandRight: () => (isLargeScreen ? rightPanel.current?.expand() : setRightDrawerOpen(true)),
    }),
    [isLargeScreen]
  );

  const leftOpen = isLargeScreen ? !leftPanelCollapsed : leftDrawerOpen;
  const rightOpen = isLargeScreen ? !rightPanelCollapsed : rightDrawerOpen;

  const left = typeof props.left === 'function' ? props.left({ isLargeScreen, leftOpen, rightOpen }) : props.left;
  const right = typeof props.right === 'function' ? props.right({ isLargeScreen, leftOpen, rightOpen }) : props.right;
  const children =
    typeof props.children === 'function' ? props.children({ isLargeScreen, leftOpen, rightOpen }) : props.children;

  if (!isLargeScreen) {
    return (
      <Box
        sx={{
          height: '100%',
          overflow: 'auto',
          bgcolor: 'background.default',
        }}>
        {children}
        <Drawer
          open={leftDrawerOpen}
          sx={{ zIndex: (theme) => theme.zIndex.speedDial, [`.${backdropClasses.root}`]: { top: 64 } }}
          onClose={() => setLeftDrawerOpen(false)}
          slotProps={{
            paper: { sx: { width: 300, height: 'unset', top: 64, bottom: 0, boxShadow: 0 } },
          }}>
          {left}
        </Drawer>
        <Drawer
          anchor="right"
          open={rightDrawerOpen}
          sx={{ zIndex: (theme) => theme.zIndex.speedDial, [`.${backdropClasses.root}`]: { top: 64 } }}
          onClose={() => setRightDrawerOpen(false)}
          slotProps={{
            paper: { sx: { width: 'calc(100% - 32px)', height: 'unset', top: 64, bottom: 0, boxShadow: 0 } },
          }}>
          {right}
        </Drawer>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'background.default',
      }}>
      <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal">
        {left && (
          <Box
            component={Panel}
            ref={leftPanel}
            defaultSize={10}
            minSize={10}
            collapsible
            onCollapse={() => {
              onLeftCollapse?.(true);
              setLeftPanelCollapsed(true);
            }}
            onExpand={() => {
              onLeftCollapse?.(false);
              setLeftPanelCollapsed(false);
            }}>
            {left}
          </Box>
        )}

        <ResizeHandle
          collapsed={leftPanelCollapsed}
          onClick={() => leftPanelCollapsed && leftPanel.current?.expand()}
        />

        <Box component={Panel} minSize={30}>
          {children}
        </Box>

        <ResizeHandle
          collapsed={rightPanelCollapsed}
          onClick={() => rightPanelCollapsed && rightPanel.current?.expand()}
        />

        <Box
          component={Panel}
          ref={rightPanel}
          defaultSize={30}
          minSize={30}
          collapsible
          onCollapse={() => {
            onRightCollapse?.(true);
            setRightPanelCollapsed(true);
          }}
          onExpand={() => {
            onRightCollapse?.(false);
            setRightPanelCollapsed(false);
          }}>
          {right}
        </Box>
      </Box>
    </Box>
  );
};

export default ColumnsLayout;

function ResizeHandle({ collapsed = undefined, ...props }: { collapsed?: boolean } & BoxProps) {
  return (
    <ResizeHandleRoot
      component={PanelResizeHandle}
      className={cx(collapsed && 'collapsed')}
      sx={{ borderColor: 'divider' }}>
      <Box {...props} className="handler" />
    </ResizeHandleRoot>
  );
}

const ResizeHandleRoot = styled(Box)<BoxProps>`
  width: 0;
  border-left: 1px solid ${({ theme }) => theme.palette.background.default};
  height: 100%;
  position: relative;
  overflow: visible;
  user-select: none;
  outline: none;
  z-index: ${({ theme }) => theme.zIndex.speedDial};

  .handler {
    position: absolute;
    top: 0;
    bottom: 0;
    width: ${({ theme }) => theme.spacing(1)};
    transform: translateX(-50%);
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: ${({ theme }) => theme.transitions.create('all', { easing: theme.transitions.easing.sharp })};
  }

  :hover,
  &[data-resize-handle-active] {
    .handler {
      background-color: ${({ theme }) => theme.palette.background.default};
    }
  }

  &.collapsed {
    border: none;

    .handler {
      display: none;
    }
  }
`;

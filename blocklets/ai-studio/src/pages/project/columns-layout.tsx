import { cx } from '@emotion/css';
import {
  DragIndicatorRounded,
  KeyboardDoubleArrowLeftRounded,
  KeyboardDoubleArrowRightRounded,
} from '@mui/icons-material';
import { Box, BoxProps, Drawer, styled, useMediaQuery, useTheme } from '@mui/material';
import { ReactNode, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export interface ImperativeColumnsLayout {
  collapseLeft: () => void;
  expandLeft: () => void;
  collapseRight: () => void;
  expandRight: () => void;
}

const ColumnsLayout = forwardRef<
  ImperativeColumnsLayout,
  {
    left?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
    right?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
    children?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
    onLeftCollapse?: (collapsed: boolean) => void;
    onRightCollapse?: (collapsed: boolean) => void;
  }
>(({ onLeftCollapse, onRightCollapse, ...props }, ref) => {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const leftPanel = useRef<ImperativePanelHandle>();
  const rightPanel = useRef<ImperativePanelHandle>();

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
      <Box height="100%" overflow="auto">
        {children}

        <Drawer
          open={leftDrawerOpen}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
          PaperProps={{ sx: { width: 300, pt: 8 } }}
          onClose={() => setLeftDrawerOpen(false)}>
          {left}
        </Drawer>

        <Drawer
          anchor="right"
          open={rightDrawerOpen}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
          PaperProps={{ sx: { width: 'calc(100% - 16px)', pt: 8 } }}
          onClose={() => setRightDrawerOpen(false)}>
          {right}
        </Drawer>
      </Box>
    );
  }

  return (
    <Box height="100%">
      <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal">
        <Box
          component={Panel}
          ref={leftPanel}
          defaultSize={10}
          minSize={10}
          collapsible
          onCollapse={(collapsed) => {
            onLeftCollapse?.(collapsed);
            setLeftPanelCollapsed(collapsed);
          }}>
          {left}
        </Box>

        <ResizeHandle
          collapsed={leftPanelCollapsed}
          icon={leftPanelCollapsed ? <KeyboardDoubleArrowRightRounded /> : undefined}
          onClick={() => leftPanelCollapsed && leftPanel.current?.expand()}
        />

        <Box component={Panel} minSize={30}>
          {children}
        </Box>

        <ResizeHandle
          collapsed={rightPanelCollapsed}
          icon={rightPanelCollapsed ? <KeyboardDoubleArrowLeftRounded /> : undefined}
          onClick={() => rightPanelCollapsed && rightPanel.current?.expand()}
        />

        <Box
          component={Panel}
          ref={rightPanel}
          defaultSize={45}
          minSize={20}
          collapsible
          onCollapse={(collapsed) => {
            onRightCollapse?.(collapsed);
            setRightPanelCollapsed(collapsed);
          }}>
          {right}
        </Box>
      </Box>
    </Box>
  );
});

export default ColumnsLayout;

function ResizeHandle({ icon, collapsed, ...props }: { collapsed?: boolean; icon?: ReactNode } & BoxProps) {
  return (
    <ResizeHandleRoot component={PanelResizeHandle} className={cx(collapsed && 'collapsed')}>
      <Box {...props} className="handler">
        {icon || <DragIndicatorRounded />}
      </Box>
    </ResizeHandleRoot>
  );
}

const ResizeHandleRoot = styled(Box)`
  width: 0;
  height: 100%;
  position: relative;
  z-index: 10;
  overflow: visible;
  border-right: ${({ theme }) => `1px dashed ${theme.palette.grey[200]}`};

  &.collapsed {
    border-width: 0;
  }

  .handler {
    position: absolute;
    left: -5px;
    top: 0;
    bottom: 0;
    width: 10px;
    height: 100px;
    border-radius: 5px;
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }) => theme.palette.grey[100]};
    transition: ${({ theme }) =>
      theme.transitions.create('all', {
        easing: theme.transitions.easing.sharp,
      })};

    svg {
      font-size: 14px;
    }
  }

  :hover,
  &[data-resize-handle-active] {
    .handler {
      left: -5px;
      height: calc(100% - 128px);
      width: 10px;
      background-color: ${({ theme }) => theme.palette.grey[100]};
      border-radius: 5px;

      svg {
        opacity: 0.7;
      }
    }
  }
`;

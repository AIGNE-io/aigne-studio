import './index.css';

import { Box, BoxProps } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

export interface FullScreenOptions {
  enableEscExit?: boolean;
  targetContainer?: HTMLElement | null;
}

export interface FullScreenHandle {
  active: boolean;
  enter: () => Promise<void>;
  exit: () => Promise<void>;
  node: React.MutableRefObject<HTMLDivElement | null>;
}

export interface FullScreenProps {
  handle: FullScreenHandle;
  children: React.ReactNode;
  onChange?: (state: boolean, handle: FullScreenHandle) => void;
  className?: string;
  options?: FullScreenOptions;
}

export function useFullScreenHandle(): FullScreenHandle {
  const [active, setActive] = useState(false);
  const node = useRef<HTMLDivElement | null>(null);

  const enter = useCallback(async () => {
    setActive(true);
    // 通知屏幕阅读器和辅助技术
    document.dispatchEvent(new CustomEvent('fullscreenchange', { detail: { isFullScreen: true } }));
    return Promise.resolve();
  }, []);

  const exit = useCallback(async () => {
    setActive(false);
    // 通知屏幕阅读器和辅助技术
    document.dispatchEvent(new CustomEvent('fullscreenchange', { detail: { isFullScreen: false } }));
    return Promise.resolve();
  }, []);

  return { active, enter, exit, node };
}

// eslint-disable-next-line react/function-component-definition
export const FullScreen: React.FC<FullScreenProps> = ({ handle, children, onChange, className, options = {} }) => {
  const { enableEscExit = false, targetContainer = null } = options;

  useEffect(() => {
    if (onChange) {
      onChange(handle.active, handle);
    }
  }, [handle.active, onChange, handle]);

  // ESC键退出全屏功能
  useEffect(() => {
    if (!enableEscExit || !handle.active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handle.exit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // eslint-disable-next-line consistent-return
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableEscExit, handle.active, handle]);

  // 根据是否有 targetContainer 决定样式，如果有 targetContainer 则将样式设置为绝对定位，则不是整个浏览器全屏
  const extraProps: BoxProps = targetContainer
    ? {
        sx: {
          position: 'absolute !important',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          height: '100%',
          width: '100%',
        },
      }
    : {};

  return (
    <>
      <CSSTransition in={handle.active} timeout={500} classNames="full-screen" unmountOnExit nodeRef={handle.node}>
        <Box ref={handle.node} className={`full-screen-container ${className}`} {...extraProps}>
          {handle.active && children}
        </Box>
      </CSSTransition>

      {!handle.active && children}
    </>
  );
};

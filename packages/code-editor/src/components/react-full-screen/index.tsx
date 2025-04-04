import './index.css';

import { Box } from '@mui/material';
import { useKeyPress } from 'ahooks';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface FullScreenOptions {
  enableEscExit?: boolean;
  targetContainer?: (() => HTMLElement | null) | HTMLElement | null;
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
  const { enableEscExit = true, targetContainer = null } = options || {};
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (onChange) {
      onChange(handle.active, handle);
    }
  }, [handle.active, onChange, handle]);

  useEffect(() => {
    if (targetContainer && handle.active) {
      const targetElement = typeof targetContainer === 'function' ? targetContainer() : targetContainer;
      setContainer(targetElement);
    } else {
      setContainer(null);
    }
  }, [targetContainer, handle.active]);

  useKeyPress(['esc'], () => {
    if (enableEscExit && handle.active) {
      handle.exit();
    }
  });

  const portalTarget = container instanceof HTMLElement ? container : document.body;

  if (handle.active) {
    return createPortal(
      <Box
        ref={handle.node}
        className={`full-screen-container ${className || ''}`}
        sx={{
          animation: 'full-screen-enter 300ms forwards',
        }}>
        {handle.active && children}
      </Box>,
      portalTarget ?? document.body
    );
  }

  return children;
};

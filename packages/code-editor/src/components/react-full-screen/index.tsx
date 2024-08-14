import './index.css';

import { Box } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CSSTransition } from 'react-transition-group';

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
}

export function useFullScreenHandle(): FullScreenHandle {
  const [active, setActive] = useState(false);
  const node = useRef<HTMLDivElement | null>(null);

  const enter = useCallback(async () => {
    setActive(true);
  }, []);

  const exit = useCallback(async () => {
    setActive(false);
  }, []);

  return { active, enter, exit, node };
}

// eslint-disable-next-line react/function-component-definition
export const FullScreen: React.FC<FullScreenProps> = ({ handle, children, onChange, className }) => {
  useEffect(() => {
    if (onChange) {
      onChange(handle.active, handle);
    }
  }, [handle.active, onChange, handle]);

  return (
    <>
      <CSSTransition in={handle.active} timeout={500} unmountOnExit>
        <Box ref={handle.node} className={`full-screen-container ${className}`}>
          {handle.active && children}
        </Box>
      </CSSTransition>

      {!handle.active && children}
    </>
  );
};

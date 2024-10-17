import { Box, BoxProps } from '@mui/material';
import { ComponentProps, useEffect, useMemo } from 'react';
import * as scrollToBottom from 'react-scroll-to-bottom';
// @ts-ignore
import useInternalContext from 'react-scroll-to-bottom/lib/esm/hooks/internal/useInternalContext';

import { useScrollView } from '../contexts/ScrollView';

// @ts-ignore
const Composer = scrollToBottom.Composer as typeof scrollToBottom.default;

export default function ScrollView({
  children,
  scroll = 'element',
  component = 'div',
  initialScrollBehavior,
  ...props
}: BoxProps & {
  scroll?: 'window' | 'element';
  initialScrollBehavior?: ComponentProps<typeof Composer>['initialScrollBehavior'];
}) {
  const ctx = useScrollView();

  return (
    <Composer initialScrollBehavior={initialScrollBehavior || ctx?.initialScrollBehavior || 'auto'}>
      <ScrollViewWithinWindow scroll={ctx?.scroll || scroll} component={ctx?.component || component} {...props}>
        {children}
      </ScrollViewWithinWindow>
    </Composer>
  );
}

function ScrollViewWithinWindow({
  children,
  scroll,
  component,
  ...props
}: BoxProps & { scroll: 'window' | 'element' }) {
  const { setTarget } = useInternalContext();
  const ele = useFakeScrollElementOfWindow();

  useEffect(() => {
    if (scroll === 'window') {
      setTarget(ele);
    }
  }, [scroll]);

  if (!component) return children;

  return (
    <Box component={component} {...props} ref={scroll === 'element' ? setTarget : undefined}>
      {children}
    </Box>
  );
}

function useFakeScrollElementOfWindow() {
  return useMemo(() => {
    const e = document.scrollingElement as any;
    return new Proxy(e, {
      get: (_, p: string) => {
        if (p === 'offsetHeight') return window.innerHeight;
        if (['addEventListener', 'removeEventListener'].includes(p)) return (window as any)[p].bind(window);
        const v = e[p];
        if (v instanceof Function) return v.bind(e);
        return v;
      },
      set: (_, p, v) => {
        e[p] = v;
        return true;
      },
    });
  }, []);
}

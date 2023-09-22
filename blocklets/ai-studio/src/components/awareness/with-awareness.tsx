import { FocusEventHandler, ReactElement, cloneElement, useEffect } from 'react';

import { useStore } from '../../pages/project/yjs-state';

export default function WithAwareness({
  path,
  onMount,
  children,
}: {
  path: (string | number)[];
  onMount?: boolean;
  children: ReactElement<{ onFocus?: FocusEventHandler }>;
}) {
  const { provider } = useStore();

  useEffect(() => {
    if (onMount) provider.awareness.setLocalStateField('focus', { path });
  }, [onMount, path.join('.')]);

  return cloneElement(children, {
    onFocus: (e: any) => {
      provider.awareness.setLocalStateField('focus', { path });
      children.props.onFocus?.(e);
    },
  });
}

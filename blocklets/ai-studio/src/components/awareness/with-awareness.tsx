import { FocusEventHandler, ReactElement, cloneElement, useEffect } from 'react';

import { useStore } from '../../pages/project/yjs-state';

export default function WithAwareness({
  projectId,
  gitRef,
  path,
  onMount,
  children,
}: {
  projectId: string;
  gitRef: string;
  path: (string | number)[];
  onMount?: boolean;
  children: ReactElement<{ onFocus?: FocusEventHandler }>;
}) {
  const { provider } = useStore(projectId, gitRef);

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

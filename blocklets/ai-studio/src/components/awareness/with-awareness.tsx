import { useSessionContext } from '@app/contexts/session';
import { pick } from 'lodash';
import { FocusEventHandler, ReactElement, cloneElement, useEffect } from 'react';

import { useProjectStore } from '../../pages/project/yjs-state';

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
  const { provider } = useProjectStore(projectId, gitRef);
  const { session } = useSessionContext();
  const setState = () => {
    console.log(path, '111');
    provider.awareness.setLocalStateField('focus', {
      path,
      user: pick(session.user, 'did', 'fullName', 'avatar'),
    });
  };

  useEffect(() => {
    if (onMount) setState();
  }, [onMount, path.join('.')]);

  return cloneElement(children, {
    onFocus: (e: any) => {
      setState();
      children.props.onFocus?.(e);
    },
  });
}

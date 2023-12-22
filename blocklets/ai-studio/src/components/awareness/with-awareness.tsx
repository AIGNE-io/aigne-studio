import { useSessionContext } from '@app/contexts/session';
import { Box } from '@mui/material';
import { pick } from 'lodash';
import { FocusEventHandler, ReactElement, cloneElement, useEffect } from 'react';

import { useProjectStore } from '../../pages/project/yjs-state';
import AwarenessIndicator from './awareness-indicator';

export default function WithAwareness({
  projectId,
  gitRef,
  path,
  onMount,
  children,
  right,
  top = -2,
  left,
  bottom,
  indicator = true,
}: {
  projectId: string;
  gitRef: string;
  path: (string | number)[];
  indicator?: boolean;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  onMount?: boolean;
  children: ReactElement<{ onFocus?: FocusEventHandler }>;
}) {
  const { provider } = useProjectStore(projectId, gitRef);
  const { session } = useSessionContext();
  const setState = () => {
    provider.awareness.setLocalStateField('focus', {
      path,
      user: pick(session.user, 'did', 'fullName', 'avatar'),
    });
  };

  useEffect(() => {
    if (onMount) setState();
  }, [onMount, path.join('.')]);

  return (
    <Box position="relative">
      {cloneElement(children, {
        onFocus: (e: any) => {
          setState();
          children.props.onFocus?.(e);
        },
      })}
      {indicator && (
        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={path}
          sx={{ position: 'absolute', top, left, bottom, right }}
        />
      )}
    </Box>
  );
}

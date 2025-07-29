import { useSessionContext } from '@app/contexts/session';
import { Box, SxProps, Theme } from '@mui/material';
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
  sx,
  indicator = true,
}: {
  projectId: string;
  gitRef: string;
  path: (string | number)[];
  indicator?: boolean;
  sx?: SxProps<Theme>;
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
    <Box
      sx={{
        position: 'relative',
      }}>
      {cloneElement(children, {
        onFocus: (e: any) => {
          setState();
          children.props.onFocus?.(e);
        },
      })}
      {indicator && (
        <AwarenessIndicator projectId={projectId} gitRef={gitRef} path={path} sx={{ position: 'absolute', ...sx }} />
      )}
    </Box>
  );
}

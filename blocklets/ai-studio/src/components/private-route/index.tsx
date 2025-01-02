import { Box, CircularProgress } from '@mui/material';
import type { PropsWithChildren } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { useSessionContext } from '../../contexts/session';

interface Props {
  roles?: string[];
}

export function PrivateRoute({ roles, children }: PropsWithChildren<Props>) {
  const { session } = useSessionContext();
  if (!session.initialized) {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        justifyContent="center"
        alignItems="center">
        <CircularProgress />
      </Box>
    );
  }
  if (!session?.user) {
    session.login(() => {}, { openMode: 'redirect', redirect: window.location.href });
    return null;
  }
  if (roles && !roles.includes(session?.user?.role)) {
    return <Navigate to="/" replace />;
  }
  return children || <Outlet />;
}

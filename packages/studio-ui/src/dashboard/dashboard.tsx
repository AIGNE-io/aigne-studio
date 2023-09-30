import Header from '@blocklet/ui-react/lib/Header';
import { Box, BoxProps, Stack } from '@mui/material';
import { ReactNode } from 'react';

export interface DashboardProps {
  HeaderProps?: {
    logo?: ReactNode;
    brand?: ReactNode;
    description?: ReactNode;
    brandAddon?: ReactNode;
    addons?: ReactNode | ((builtin: ReactNode[]) => ReactNode[] | ReactNode);
    sx?: BoxProps['sx'];
  };
  ContentProps?: BoxProps;
  children?: ReactNode;
  footer?: ReactNode;
}

export default function Dashboard({ HeaderProps, ContentProps, children, footer }: DashboardProps) {
  return (
    <Stack sx={{ minHeight: '100vh' }}>
      <Box
        component={Header}
        {...HeaderProps}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          '.header-container': { maxWidth: 'none' },
          ...HeaderProps?.sx,
        }}
      />

      <Box flexGrow={1} component="main" {...ContentProps}>
        {children}
      </Box>

      {footer}
    </Stack>
  );
}

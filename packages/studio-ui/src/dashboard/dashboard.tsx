import Header from '@blocklet/ui-react/lib/Header';
import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

export interface DashboardProps {
  HeaderProps?: {
    logo?: ReactNode;
    brand?: ReactNode;
    description?: ReactNode;
    brandAddon?: ReactNode;
    addons?: ReactNode | ((builtin: ReactNode[]) => ReactNode[] | ReactNode);
    sx: BoxProps['sx'];
  };
  children?: ReactNode;
}

export default function Dashboard({ HeaderProps, children }: DashboardProps) {
  return (
    <Box>
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

      <Box component="main">{children}</Box>
    </Box>
  );
}

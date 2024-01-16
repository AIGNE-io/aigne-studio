import './content-placeholder.css';

import { Box } from '@mui/material';
import { ReactNode } from 'react';

export default function Placeholder({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <Box
      className={className || 'Placeholder__root'}
      sx={{
        fontSize: (theme) => theme.typography.caption.fontSize,
        color: (theme) => theme.palette.action.disabled,
      }}>
      {children}
    </Box>
  );
}

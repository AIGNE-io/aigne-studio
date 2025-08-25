import './content-placeholder.css';

import { Box } from '@mui/material';
import { JSX, ReactNode } from 'react';

export default function Placeholder({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return <Box className={className || 'Placeholder__root'}>{children}</Box>;
}

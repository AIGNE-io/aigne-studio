import type { BoxProps } from '@mui/material';
import { Box, CircularProgress } from '@mui/material';

export interface LoadingProps extends BoxProps {
  fixed?: boolean;
}

export default function Loading({ fixed, ...props }: LoadingProps) {
  return (
    <Box
      display="flex"
      flex={1}
      height="100%"
      alignItems="center"
      justifyContent="center"
      {...props}
      sx={
        fixed
          ? {
              position: 'fixed',
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
            }
          : undefined
      }>
      <CircularProgress size={30} />
    </Box>
  );
}

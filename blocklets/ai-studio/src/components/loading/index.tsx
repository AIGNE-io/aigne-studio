import { Box, BoxProps, CircularProgress } from '@mui/material';

export interface LoadingProps extends BoxProps {
  fixed?: boolean;
}

export default function Loading({ fixed, ...props }: LoadingProps) {
  return (
    <Box
      {...props}
      sx={[{
        display: "flex",
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center"
      }, fixed
        ? {
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          }
        : undefined, props.sx]}>
      <CircularProgress size={30} />
    </Box>
  );
}

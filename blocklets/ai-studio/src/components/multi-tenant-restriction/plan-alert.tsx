import { Alert, AlertProps } from '@mui/material';

export function PlanAlert({ sx, children, ...rest }: AlertProps) {
  const mergedSx = { px: 1, py: 0.5, '.MuiAlert-icon': { m: 0 }, ...sx };
  return (
    <Alert variant="outlined" severity="warning" icon={<i />} sx={mergedSx} {...rest}>
      {children}
    </Alert>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Alert, AlertProps, Box, Button } from '@mui/material';

import { useMultiTenantRestriction } from './state';

export function PlanAlert({ sx, children, ...rest }: AlertProps) {
  const { t } = useLocaleContext();
  const { showPlanUpgrade } = useMultiTenantRestriction();
  const mergedSx = { display: 'flex', px: 1, py: 0.5, '.MuiAlert-icon': { m: 0 }, ...sx };
  return (
    <Alert variant="outlined" severity="warning" icon={<i />} sx={mergedSx} {...rest}>
      <Box component="span" sx={{ verticalAlign: 'middle' }}>
        {children}
      </Box>
      <Button onClick={() => showPlanUpgrade()}>{t('upgrade')}</Button>
    </Alert>
  );
}

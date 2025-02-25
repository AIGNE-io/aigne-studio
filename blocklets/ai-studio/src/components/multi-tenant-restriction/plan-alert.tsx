import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Alert, AlertProps, Button } from '@mui/material';

import { useMultiTenantRestriction } from './state';

export function PlanAlert({ sx, children, ...rest }: AlertProps) {
  const { t } = useLocaleContext();
  const { showPlanUpgrade } = useMultiTenantRestriction();
  const mergedSx = { display: 'flex', px: 1, py: 0.5, '.MuiAlert-icon': { m: 0 }, ...sx };
  return (
    <Alert variant="outlined" severity="warning" icon={<i />} sx={mergedSx} {...rest}>
      {children}
      <Button onClick={() => showPlanUpgrade()}>{t('upgrade')}</Button>
    </Alert>
  );
}

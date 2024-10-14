import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import ArrowUpIcon from '@iconify-icons/tabler/circle-arrow-up';
import DiamondIcon from '@iconify-icons/tabler/diamond';
import { Close } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';

import { PricingTable } from './pricing-table';
import { useIsProUser, useMultiTenantRestriction } from './state';

interface Props {}

export function PlanUpgrade({ ...rest }: Props) {
  const { hidePlanUpgrade, planUpgradeVisible, type } = useMultiTenantRestriction();
  const { t } = useLocaleContext();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const options = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly (20% OFF)' },
  ];

  return (
    <Dialog
      fullScreen={downSm}
      open={planUpgradeVisible}
      onClose={hidePlanUpgrade}
      PaperProps={{ sx: { width: { xs: '100%', md: 860, lg: 1200 }, maxWidth: '100%' } }}
      {...rest}>
      <DialogTitle className="between" sx={{ border: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Icon icon={ArrowUpIcon} />
          <span>Upgrade plan</span>
        </Box>

        <IconButton size="small" onClick={hidePlanUpgrade}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {type && (
          <Alert
            variant="outlined"
            severity="warning"
            icon={<span />}
            sx={{
              position: 'relative',
              px: 2.5,
              borderColor: 'divider',
              '.MuiAlert-icon': {
                display: 'inline-block',
                position: 'absolute',
                top: 8,
                bottom: 8,
                left: 8,
                width: 2,
                bgcolor: 'warning.main',
              },
            }}>
            {t(`multiTenantRestriction.${type}.desc`)}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: type ? 2 : 0 }}>
          {/* <Box sx={{ fontSize: 16, fontWeight: 'bold' }}>All plans</Box> */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
            }}>
            <ToggleButtonGroup
              color="primary"
              size="small"
              value={billingCycle}
              exclusive
              onChange={(_, v) => setBillingCycle(v)}
              sx={{
                '.MuiToggleButtonGroup-grouped': {
                  border: 0,
                  fontWeight: 'bold',
                  bgcolor: '#fff',
                },
                '.MuiToggleButtonGroup-grouped.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: '#fff',
                },
              }}>
              {options.map((x) => {
                return (
                  <ToggleButton key={x.value} value={x.value}>
                    {x.label}
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Box>
          <PricingTable />
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export function PlanUpgradeButton() {
  const { showPlanUpgrade } = useMultiTenantRestriction();
  const isPro = useIsProUser();
  return (
    <Button
      color={isPro ? 'inherit' : 'primary'}
      startIcon={<Icon icon={DiamondIcon} />}
      onClick={() => showPlanUpgrade()}>
      Upgrade Plan
    </Button>
  );
}

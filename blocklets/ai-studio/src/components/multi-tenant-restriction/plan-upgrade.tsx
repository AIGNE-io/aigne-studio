import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import ArrowUpIcon from '@iconify-icons/tabler/circle-arrow-up';
import DiamondIcon from '@iconify-icons/tabler/diamond';
import InfoCircleIcon from '@iconify-icons/tabler/info-circle';
import { Close } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Theme,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';

import { PricingTable } from './pricing-table';
import { useMultiTenantRestriction, usePlans } from './state';

export function PlanUpgrade() {
  const { hidePlanUpgrade, planUpgradeVisible, type } = useMultiTenantRestriction();
  const { t } = useLocaleContext();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const plans = usePlans();

  if (!plans) {
    return null;
  }

  return (
    <Dialog
      fullScreen={downSm}
      open={planUpgradeVisible}
      onClose={hidePlanUpgrade}
      PaperProps={{ sx: { width: { xs: '100%', md: 860, lg: 1100 }, maxWidth: '100%', pb: 2 } }}>
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

        <Box sx={{ display: 'flex', flexDirection: 'column', mt: type ? 2 : 0 }}>
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
                  width: 80,
                  border: 0,
                  fontWeight: 'bold',
                  bgcolor: '#fff',
                },
                '.MuiToggleButtonGroup-grouped.Mui-selected': {
                  bgcolor: '#000',
                  color: '#fff',
                  '&:hover': {
                    bgcolor: '#000',
                  },
                },
              }}>
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="yearly">Yearly</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <PricingTable plans={plans} billingCycle={billingCycle} sx={{ mt: 1 }} />

          <Box
            component={Link}
            href="https://www.arcblock.io/blog/tags/aigne"
            target="_blank"
            sx={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: 13,
              color: 'text.secondary',
              textDecoration: 'underline',
            }}>
            <Box component={Icon} icon={InfoCircleIcon} sx={{ fontSize: 16 }} />
            Learn more about AI Service
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export function PlanUpgradeButton() {
  const { showPlanUpgrade } = useMultiTenantRestriction();
  return (
    <Button color="primary" startIcon={<Icon icon={DiamondIcon} />} onClick={() => showPlanUpgrade()}>
      Upgrade Plan
    </Button>
  );
}

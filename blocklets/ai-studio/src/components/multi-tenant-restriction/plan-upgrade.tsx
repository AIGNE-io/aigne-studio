import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import ArrowUpIcon from '@iconify-icons/tabler/circle-arrow-up';
import DiamondIcon from '@iconify-icons/tabler/diamond';
import InfoCircleIcon from '@iconify-icons/tabler/info-circle';
import ReceiptIcon from '@iconify-icons/tabler/receipt';
import { Close } from '@mui/icons-material';
import type { Theme } from '@mui/material';
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';
import { joinURL } from 'ufo';

import { PAYMENT_KIT_MOUNT_POINT } from '../../libs/constants';
import { PricingTable } from './pricing-table';
import { premiumPlanEnabled, useIsPremiumUser, useMultiTenantRestriction, usePlans } from './state';

const billingLink = joinURL(PAYMENT_KIT_MOUNT_POINT, '/customer');

export function PlanUpgrade() {
  const { hidePlanUpgrade, planUpgradeVisible, type } = useMultiTenantRestriction();
  const { t, locale } = useLocaleContext();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const isPremiumUser = useIsPremiumUser();
  const plans = usePlans();

  if (!plans || !premiumPlanEnabled) {
    return null;
  }

  if (isPremiumUser) {
    plans[1]!.billingLink = (
      <Box
        component={Link}
        href={billingLink}
        target="_blank"
        sx={{
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: 13,
          color: 'text.secondary',
          textDecoration: 'underline',
        }}>
        <Box component={Icon} icon={ReceiptIcon} sx={{ fontSize: 16 }} />
        View my billing information
      </Box>
    );
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
              onChange={(_, v) => {
                if (v) {
                  setBillingCycle(v);
                }
              }}
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
            href={`https://www.arcblock.io/blog/tags/${locale}/aigne`}
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
  const { t } = useLocaleContext();
  if (!premiumPlanEnabled) return null;
  return (
    <Tooltip title={t('pricingAndPlans.buttonTooltip')}>
      <IconButton onClick={() => showPlanUpgrade()}>
        <Box component={Icon} icon={DiamondIcon} sx={{ fontSize: 24 }} />
      </IconButton>
    </Tooltip>
  );
}

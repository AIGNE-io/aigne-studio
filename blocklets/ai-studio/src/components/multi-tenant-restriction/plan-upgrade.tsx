import { useIsProUser } from '@app/contexts/session';
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
  useMediaQuery,
} from '@mui/material';

import { PricingTable } from './pricing-table';
import { useMultiTenantRestriction } from './state';

interface Props {}

export function PlanUpgrade({ ...rest }: Props) {
  const { hidePlanUpgrade, planUpgradeVisible, type } = useMultiTenantRestriction();
  const { t } = useLocaleContext();
  const downSm = useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'));

  return (
    <Dialog
      fullScreen={downSm}
      open={planUpgradeVisible}
      onClose={hidePlanUpgrade}
      PaperProps={{ sx: { width: { xs: '100%', md: 860, lg: 1100 }, maxWidth: '100%' } }}
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

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 3 }}>
          <Box sx={{ fontSize: 16, fontWeight: 'bold' }}>All plans</Box>
          <PricingTable />
        </Box>

        {/* <Box
          component={Link}
          href="https://www.arcblock.io/blog/tags/en/aigne"
          target="_blank"
          sx={{ display: 'block', color: 'text.secondary', fontSize: 14, mt: 1, textDecorationColor: 'inherit' }}>
          Learn how to launch a serverless AIGNE
        </Box> */}
      </DialogContent>

      {/* <DialogActions sx={{ border: 0 }}>
        <Button onClick={hidePlanUpgrade} variant="outlined">
          {t('cancel')}
        </Button>
        <Button
          onClick={() => {
            hidePlanUpgrade();
            window.open(AI_STUDIO_STORE, '_blank');
          }}
          variant="contained"
          color="primary">
          Launch My Serverless AIGNE
        </Button>
      </DialogActions> */}
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

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import DiamondIcon from '@iconify-icons/tabler/diamond';
import { Box, Chip, ChipProps, Tooltip } from '@mui/material';

import { useIsAdmin } from '../../contexts/session';
import { useIsPremiumUser } from './state';

export function PremiumFeatureTag({ sx, ...rest }: ChipProps) {
  const mergedSx = [{ height: 20, fontSize: 12 }, ...(Array.isArray(sx) ? sx : [sx])];
  const isAdmin = useIsAdmin();
  const isPremiumUser = useIsPremiumUser();
  const { t } = useLocaleContext();
  if (isAdmin || isPremiumUser) return null;
  return (
    <Tooltip title={t('premiumFeatureTip')}>
      <Chip
        color="warning"
        size="small"
        icon={<Box component={Icon} icon={DiamondIcon} sx={{ fontSize: 16, transform: 'scale(0.8)' }} />}
        label="Premium"
        sx={mergedSx}
        {...rest}
      />
    </Tooltip>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import DiamondIcon from '@iconify-icons/tabler/diamond';
import { Box, ChipProps, Tooltip } from '@mui/material';

import { useIsAdmin } from '../../contexts/session';
import { useIsPremiumUser } from './state';

export function PremiumFeatureTag({ sx, ...rest }: ChipProps) {
  const mergedSx = [
    {
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: 24,
      height: 20,
      border: 1,
      borderColor: 'grey.400',
      borderRadius: 0.5,
      bgcolor: 'rgba(0, 0, 0, 0.04)',
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];
  const isAdmin = useIsAdmin();
  const isPremiumUser = useIsPremiumUser();
  const { t } = useLocaleContext();
  if (isAdmin || isPremiumUser) return null;
  return (
    <Tooltip title={t('premiumFeatureTip')}>
      <Box sx={mergedSx} {...rest}>
        <Box component={Icon} icon={DiamondIcon} sx={{ fontSize: 16, transform: 'scale(0.9)', color: 'grey.500' }} />
      </Box>
    </Tooltip>
  );
}

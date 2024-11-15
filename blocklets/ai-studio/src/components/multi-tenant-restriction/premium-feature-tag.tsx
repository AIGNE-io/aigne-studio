import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, ChipProps, Tooltip } from '@mui/material';

import { useIsAdmin } from '../../contexts/session';
import { useIsPremiumUser } from './state';

export function PremiumFeatureTag({ sx, ...rest }: ChipProps) {
  const mergedSx = [
    {
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 20,
      px: 1,
      border: 1,
      borderColor: '#fde68a',
      borderRadius: 0.5,
      fontSize: 12,
      color: '#b45309',
      bgcolor: '#fef4c7',
      cursor: 'pointer',
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];
  const isAdmin = useIsAdmin();
  const isPremiumUser = useIsPremiumUser();
  const { t } = useLocaleContext();
  if (isAdmin || isPremiumUser) return null;
  return (
    <Tooltip title={t('premiumFeatureTip')}>
      <Box component="span" sx={mergedSx} {...rest}>
        PREMIUM
      </Box>
    </Tooltip>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

import { PremiumFeatureTag, useMultiTenantRestriction } from '../../../components/multi-tenant-restriction';
import AigneBannerSetting from './aigne-banner-setting';
import ColorSetting from './color-setting';
import FontFamilySetting from './font-family-setting';

export default function AppearanceSetting() {
  const { t } = useLocaleContext();
  const { quotaChecker } = useMultiTenantRestriction();
  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('primaryColor')}
        </Typography>
        <ColorSetting type="primaryColor" />
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('secondaryColor')}
        </Typography>
        <ColorSetting type="secondaryColor" />
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('fontFamily')}
        </Typography>
        <FontFamilySetting />
      </Box>

      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('aigneBannerVisibility')}
          <PremiumFeatureTag sx={{ ml: 2 }} onClick={() => quotaChecker.checkCustomBrand()} />
        </Typography>
        <AigneBannerSetting />
      </Box>
    </Stack>
  );
}

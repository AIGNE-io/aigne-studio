import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

import AigneBannerSetting from './aigne-banner-setting';
import ColorSetting from './color-setting';
import FontFamilySetting from './font-family-setting';

export default function AppearanceSetting() {
  const { t } = useLocaleContext();

  return (
    <Stack sx={{
      gap: 2
    }}>
      <Box>
        <Typography variant="subtitle2" sx={{
          mb: 0.5
        }}>
          {t('primaryColor')}
        </Typography>
        <ColorSetting type="primaryColor" />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{
          mb: 0.5
        }}>
          {t('secondaryColor')}
        </Typography>
        <ColorSetting type="secondaryColor" />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{
          mb: 0.5
        }}>
          {t('fontFamily')}
        </Typography>
        <FontFamilySetting />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{
          mb: 0.5
        }}>
          {t('aigneBannerVisibility')}
        </Typography>
        <AigneBannerSetting />
      </Box>
    </Stack>
  );
}

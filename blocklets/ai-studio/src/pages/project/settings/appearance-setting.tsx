import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

import ColorSetting from './color-setting';
import FontFamilySetting from './font-family-setting';

export default function AppearanceSetting() {
  const { t } = useLocaleContext();

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
    </Stack>
  );
}

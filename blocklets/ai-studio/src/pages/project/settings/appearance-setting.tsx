import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

import FontFamilySetting from './font-family-setting';
import PrimaryColor from './primary-color';

export default function AppearanceSetting() {
  const { t } = useLocaleContext();

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('primaryColor')}
        </Typography>
        <PrimaryColor />
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

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

export default function FunctionCodeSetting() {
  const { t } = useLocaleContext();

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle1">{t('callFunction')}</Typography>
      </Stack>
    </Box>
  );
}

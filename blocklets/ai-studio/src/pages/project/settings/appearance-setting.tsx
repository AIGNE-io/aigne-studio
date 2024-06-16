import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ConfigFileYjs } from '@blocklet/ai-runtime/types';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Box, Stack, Typography } from '@mui/material';

import FontFamilySetting from './font-family-setting';
import PrimaryColor from './primary-color';

export default function AppearanceSetting({
  config,
  onSubmit,
  setConfig,
  readOnly,
  submitLoading,
}: {
  config: ConfigFileYjs | undefined;
  onSubmit: () => void;
  setConfig: (update: (config: ConfigFileYjs) => void) => void;
  readOnly: boolean;
  submitLoading: boolean;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('primaryColor')}
        </Typography>
        <PrimaryColor config={config} setConfig={setConfig} />
      </Box>
      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('fontFamily')}
        </Typography>
        <FontFamilySetting setConfig={setConfig} config={config} />
      </Box>
      <Box>
        <LoadingButton
          disabled={readOnly}
          loading={submitLoading}
          variant="contained"
          loadingPosition="start"
          startIcon={<SaveRounded />}
          onClick={onSubmit}>
          {t('save')}
        </LoadingButton>
      </Box>
    </Stack>
  );
}

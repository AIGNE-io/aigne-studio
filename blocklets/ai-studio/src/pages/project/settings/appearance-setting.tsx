import { UpdateProjectInput } from '@api/routes/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Box, Stack, Typography } from '@mui/material';

import FontFamilySetting from './font-family-setting';
import PrimayColor from './primary-color';

export default function AppearanceSetting({
  value,
  onSubmit,
  set,
  readOnly,
  submitLoading,
}: {
  value: UpdateProjectInput;
  onSubmit: () => void;
  set: (key: string, value: any) => void;
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
        <PrimayColor value={value} set={set} />
      </Box>
      <Box>
        <Typography variant="subtitle2" mb={0.5}>
          {t('fontFamily')}
        </Typography>
        <FontFamilySetting set={set} value={value} />
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

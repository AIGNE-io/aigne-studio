import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';

export default function OutputSettings({ value, readOnly }: { value: AssistantYjs; readOnly?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="subtitle1">{t('formatResult')}</Typography>

        <TextField
          select
          hiddenLabel
          SelectProps={{ autoWidth: true, readOnly }}
          value={value.formatResultType || 'none'}
          onChange={(e) => (value.formatResultType = e.target.value as any)}>
          <MenuItem value="none">{t('stayAsIs')}</MenuItem>
        </TextField>
      </Stack>
    </Box>
  );
}

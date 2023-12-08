import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { AssistantYjs } from 'src/pages/project/yjs-state';

export default function OutputSettings({ value, readOnly }: { value: AssistantYjs; readOnly?: boolean }) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1}>
        <Typography variant="subtitle1">Format Result</Typography>

        <TextField
          select
          hiddenLabel
          SelectProps={{ autoWidth: true, readOnly }}
          value={value.formatResultType || 'none'}
          onChange={(e) => (value.formatResultType = e.target.value as any)}>
          <MenuItem value="none">Stay as is</MenuItem>
        </TextField>
      </Stack>
    </Box>
  );
}

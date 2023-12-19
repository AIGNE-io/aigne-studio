import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { useAssistantCompare } from 'src/pages/project/state';

import { useReadOnly } from '../../../contexts/session';
import PromptEditorField from '../prompt-editor-field';

export default function ImageAssistantEditorFormatPrompt({
  gitRef,
  value,
  disabled,
  compareValue,
  isRemoteCompare,
}: {
  gitRef: string;
  value: ImageAssistantYjs;
  disabled?: boolean;
  compareValue?: ImageAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  return (
    <Box
      sx={{
        border: 2,
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
        overflow: 'hidden',
        backgroundColor: getDiffBackground('prompt'),
      }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />

        <Typography variant="subtitle1">{t('formatPrompt')}</Typography>
      </Stack>

      <PromptEditorField
        value={value.prompt}
        onChange={(prompt) => (value.prompt = prompt)}
        readOnly={readOnly}
        ContentProps={{ sx: { borderRadius: 2, backgroundColor: getDiffBackground('prompt') } }}
        assistant={value}
      />
    </Box>
  );
}

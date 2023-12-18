import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Stack, Typography } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import PromptEditorField from '../prompt-editor-field';

export default function ImageAssistantEditorFormatPrompt({
  gitRef,
  value,
  disabled,
}: {
  gitRef: string;
  value: ImageAssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />

        <Typography variant="subtitle1">{t('formatPrompt')}</Typography>
      </Stack>

      <PromptEditorField
        value={value.prompt}
        onChange={(prompt) => (value.prompt = prompt)}
        readOnly={readOnly}
        ContentProps={{ sx: { borderRadius: 2 } }}
        assistant={value}
      />
    </>
  );
}

import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import ImageAssistantEditorFormatPrompt from './prompt';
import ImageAssistantSetting from './setting';

export default function ImageAssistantEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: ImageAssistantYjs;
  disabled?: boolean;
}) {
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack gap={2.5}>
      <ImageAssistantEditorFormatPrompt projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />

      <Box sx={{ borderRadius: 1 }}>
        <ImageAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

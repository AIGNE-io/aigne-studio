import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Stack } from '@mui/material';

import ImageAssistantEditorFormatPrompt from './prompt';

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
  return (
    <Stack
      sx={{
        gap: 2.5,
      }}>
      <ImageAssistantEditorFormatPrompt projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      {/* <Box sx={{ borderRadius: 1 }}>
        <ImageAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box> */}
    </Stack>
  );
}

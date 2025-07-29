import { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import PromptAssistantEditorPrompts from './prompts';

export default function PromptAssistantEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: PromptAssistantYjs;
  disabled?: boolean;
}) {
  return (
    <Stack
      sx={{
        gap: 2.5,
      }}>
      <Box sx={{ borderRadius: 1 }}>
        <PromptAssistantEditorPrompts projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>
      {/* <Box sx={{ borderRadius: 1 }}>
        <BasicHistory projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <BasicHistory projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <PromptAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box> */}
    </Stack>
  );
}

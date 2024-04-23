import { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import PromptAssistantEditorPrompts from './prompts';
import PromptAssistantSetting from './setting';

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
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack gap={2.5}>
      <Box sx={{ borderRadius: 1 }}>
        <PromptAssistantEditorPrompts projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <PromptAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

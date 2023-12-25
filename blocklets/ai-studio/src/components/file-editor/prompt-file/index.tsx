import { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import OutputSettings from '../output-settings';
import ParametersTable from '../parameters-table';
import PromptAssistantEditorPrompts from './prompts';
import PromptAssistantSetting from './setting';

// TODO 放到theme中
const bgcolor = 'rgba(249, 250, 251, 1)';

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
    <Stack gap={2} pb={10}>
      <Box sx={{ bgcolor, p: 1, borderRadius: 1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ bgcolor, py: 1, px: 2, borderRadius: 1 }}>
        <ParametersTable projectId={projectId} gitRef={gitRef} readOnly={disabled} value={value} />
      </Box>

      <PromptAssistantEditorPrompts projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <PromptAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <OutputSettings projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

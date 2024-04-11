import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import ParametersTable from '../parameters-table';
import ImageAssistantEditorPrepare from '../prepare';
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
    <Stack gap={2.5} p={2.5}>
      <Box sx={{ mx: -1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <ParametersTable projectId={projectId} gitRef={gitRef} readOnly={disabled} value={value} />
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <ImageAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <ImageAssistantEditorFormatPrompt projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />

      <Box sx={{ borderRadius: 1 }}>
        <ImageAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

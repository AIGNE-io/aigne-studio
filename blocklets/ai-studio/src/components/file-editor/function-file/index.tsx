import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import ParametersTable from '../parameters-table';
import FunctionAssistantEditorPrepare from '../prepare';
import FunctionCodeEditor from './function-code-editor';

export default function FunctionAssistantEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: FunctionAssistantYjs;
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
        <FunctionAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <FunctionCodeEditor value={value} readOnly={readOnly} />
    </Stack>
  );
}

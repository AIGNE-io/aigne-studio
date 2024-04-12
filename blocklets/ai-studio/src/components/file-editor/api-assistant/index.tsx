import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import ParametersTable from '../parameters-table';
import ApiAssistantEditorPrepare from '../prepare';
import ApiAssistantEditorAPI from './api-editor';
import ApiAssistantSetting from './setting';

export default function ApiAssistantEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: ApiAssistantYjs;
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
        <ApiAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <ApiAssistantEditorAPI projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />

      <Box sx={{ borderRadius: 1 }}>
        <ApiAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

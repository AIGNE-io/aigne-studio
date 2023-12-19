import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack, alpha } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import OutputSettings from '../output-settings';
import ParametersTable from '../parameters-table';
import ApiAssistantEditorAPI from './api';
import ApiAssistantEditorPrepare from './prepare';
import ApiAssistantSetting from './setting';

// TODO 放到theme中
const bgcolor = 'rgba(249, 250, 251, 1)';
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
    <Stack gap={2} pb={10}>
      <Box sx={{ bgcolor, p: 1, borderRadius: 1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ bgcolor, py: 1, px: 2, borderRadius: 1 }}>
        <ParametersTable readOnly={disabled} value={value} />
      </Box>

      <Stack sx={{ bgcolor, p: 1, px: 2, borderRadius: 1, gap: 2 }}>
        <ApiAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Stack>

      <ApiAssistantEditorAPI value={value} disabled={disabled} />

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <ApiAssistantSetting value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <OutputSettings value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

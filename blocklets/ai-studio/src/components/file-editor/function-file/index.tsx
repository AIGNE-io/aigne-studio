import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack, alpha } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import BasicInfoForm from '../basic-info-form';
import OutputSettings from '../output-settings';
import ParametersTable from '../parameters-table';
import FunctionCodeEditor from './function-code-editor';
import FunctionAssistantEditorPrepare from './prepare';
import FunctionAssistantSetting from './setting';

// TODO 放到theme中
const bgcolor = 'rgba(249, 250, 251, 1)';
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
    <Stack gap={2} pb={10}>
      <Box sx={{ bgcolor, p: 1, borderRadius: 1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ bgcolor, py: 1, px: 2, borderRadius: 1 }}>
        <ParametersTable readOnly={disabled} value={value} />
      </Box>

      <Stack sx={{ bgcolor, p: 1, px: 2, borderRadius: 1, gap: 2 }}>
        <FunctionAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Stack>

      <Box
        sx={{
          border: 2,
          borderColor: 'primary.main',
          borderRadius: 2,
          bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
        }}>
        <FunctionCodeEditor value={value} readOnly={readOnly} />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <FunctionAssistantSetting />
      </Box>

      <Box sx={{ bgcolor, p: 1, px: 2, borderRadius: 1 }}>
        <OutputSettings value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

import type { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
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
    <Stack gap={2.5}>
      <Box sx={{ borderRadius: 1 }}>
        <ApiAssistantSetting projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

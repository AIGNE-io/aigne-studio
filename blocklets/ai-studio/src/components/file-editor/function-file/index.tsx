import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import FunctionCodeEditor from './function-code-editor';

export default function FunctionAssistantEditor({
  projectId,
  gitRef,
  value,
  disabled = undefined,
}: {
  projectId: string;
  gitRef: string;
  value: FunctionAssistantYjs;
  disabled?: boolean;
}) {
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack
      sx={{
        gap: 2.5,
      }}>
      <FunctionCodeEditor projectId={projectId} gitRef={gitRef} value={value} readOnly={readOnly} />
    </Stack>
  );
}

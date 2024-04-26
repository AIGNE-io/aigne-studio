import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
import FunctionCodeEditor from './function-code-editor';

export default function FunctionAssistantEditor({
  gitRef,
  value,
  disabled,
}: {
  gitRef: string;
  value: FunctionAssistantYjs;
  disabled?: boolean;
}) {
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack gap={2.5}>
      <FunctionCodeEditor value={value} readOnly={readOnly} />
    </Stack>
  );
}

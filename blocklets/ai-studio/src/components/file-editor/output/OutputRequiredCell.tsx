import { OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Switch } from '@mui/material';

import { getRuntimeOutputVariable } from './type';

export default function OutputRequiredCell({ output, disabled }: { output: OutputVariableYjs; disabled: boolean }) {
  const runtimeVariable = getRuntimeOutputVariable(output);

  if (output.hidden) return;
  if (runtimeVariable) return;
  if (output.from?.type === 'input') return;
  if (output.from?.type === 'output') return;
  if (output.from?.type === 'callAgent') return null;
  if (output.from?.type === 'variable') return null;

  return (
    <Switch
      size="small"
      disabled={Boolean(disabled)}
      checked={output.required || false}
      onChange={(_, checked) => (output.required = checked)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

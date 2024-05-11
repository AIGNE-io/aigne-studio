import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { TextField, TextFieldProps } from '@mui/material';

const ignoreDescriptionVariables = new Set([
  RuntimeOutputVariable.text,
  RuntimeOutputVariable.images,
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.children,
  RuntimeOutputVariable.share,
]);

export default function OutputDescriptionCell({
  assistant,
  output,
  TextFieldProps,
}: {
  assistant: AssistantYjs;
  output: OutputVariableYjs;
  TextFieldProps?: TextFieldProps;
}) {
  const { t } = useLocaleContext();

  return (
    <TextField
      sx={{ visibility: ignoreDescriptionVariables.has(output.name as RuntimeOutputVariable) ? 'hidden' : undefined }}
      variant="standard"
      fullWidth
      hiddenLabel
      {...TextFieldProps}
      placeholder={t(assistant.type === 'prompt' ? 'outputVariablePlaceholderForLLM' : 'outputVariablePlaceholder')}
      value={output.description || ''}
      onChange={(e) => (output.description = e.target.value)}
    />
  );
}

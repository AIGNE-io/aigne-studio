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
  RuntimeOutputVariable.openingQuestions,
  RuntimeOutputVariable.openingMessage,
  RuntimeOutputVariable.profile,
]);

function isIgnoreDescription(output: OutputVariableYjs) {
  return ignoreDescriptionVariables.has(output.name as RuntimeOutputVariable);
}

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

  const input = output.from?.type === 'input' ? assistant.parameters?.[output.from.id] : undefined;

  return (
    <TextField
      sx={{ visibility: isIgnoreDescription(output) ? 'hidden' : undefined }}
      variant="standard"
      fullWidth
      hiddenLabel
      {...TextFieldProps}
      disabled={output.from?.type === 'input' || TextFieldProps?.disabled}
      placeholder={
        output.from?.type === 'input'
          ? t('outputFromInputPlaceholder', { input: input?.data.key })
          : t(assistant.type === 'prompt' ? 'outputVariablePlaceholderForLLM' : 'outputVariablePlaceholder')
      }
      value={output.description || ''}
      onChange={(e) => (output.description = e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

import { useProjectStore } from '@app/pages/project/yjs-state';
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

const fromType = ['input', 'output'];

export default function OutputDescriptionCell({
  assistant,
  output,
  TextFieldProps,
  projectId,
  gitRef,
}: {
  assistant: AssistantYjs;
  output: OutputVariableYjs;
  TextFieldProps?: TextFieldProps;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();
  const { getFileById } = useProjectStore(projectId, gitRef);

  const input = output.from?.type === 'input' ? assistant.parameters?.[output.from.id] : undefined;

  const renderPlaceholder = () => {
    if (output.from?.type === 'input') {
      return t('outputFromInputPlaceholder', { input: input?.data.key });
    }

    if (output.from?.type === 'output') {
      if (assistant.type === 'callAgent' && assistant.call) {
        const callAgent = getFileById(assistant.call.id);
        return t('referenceOutput', { agent: callAgent?.name });
      }

      return null;
    }

    if (assistant.type === 'prompt') {
      return t('outputVariablePlaceholderForLLM');
    }

    return t('outputVariablePlaceholder');
  };

  return (
    <TextField
      sx={{ visibility: isIgnoreDescription(output) ? 'hidden' : undefined }}
      variant="standard"
      fullWidth
      hiddenLabel
      {...TextFieldProps}
      disabled={fromType.includes(output.from?.type || '') || TextFieldProps?.disabled}
      placeholder={renderPlaceholder()}
      value={output.description || ''}
      onChange={(e) => (output.description = e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

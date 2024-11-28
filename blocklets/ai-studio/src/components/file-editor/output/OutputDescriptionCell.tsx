import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { TextField, TextFieldProps, Typography } from '@mui/material';
import { sortBy } from 'lodash';

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

  const input = output.from?.type === 'input' ? assistant.parameters?.[output.from.id!] : undefined;

  const renderPlaceholder = () => {
    if (output.from?.type === 'input') {
      return t('outputFromInputPlaceholder', { input: input?.data.key! });
    }

    if (output.from?.type === 'output') {
      const fromId = output.from.id;
      if (assistant.type === 'callAgent') {
        const agents = Object.values(assistant?.agents || {}).map((i) => i.data);
        for (const agent of agents) {
          const callAgent = getFileById(agent.id);
          const outputVariables =
            (callAgent?.outputVariables && sortBy(Object.values(callAgent.outputVariables), 'index')) || [];
          const found = outputVariables.find((i) => i.data.id === fromId);

          if (!!found) {
            return t('referenceOutput', { agent: callAgent?.name! });
          }
        }
      }

      return undefined;
    }

    if (assistant.type === 'prompt') {
      return t('outputVariablePlaceholderForLLM');
    }

    return t('outputVariablePlaceholder');
  };

  if (output.from?.type === 'callAgent') return undefined;

  if (fromType.includes(output.from?.type || '')) {
    return <Typography sx={{ color: 'text.disabled', my: 0.8 }}>{renderPlaceholder()}</Typography>;
  }

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

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import VariableIcon from '@iconify-icons/tabler/variable';
import { Stack, TextField, TextFieldProps, Typography } from '@mui/material';

import useCallAgentOutput from '../use-call-agent-output';
import { getRuntimeOutputVariable } from './type';

export default function OutputNameCell({
  depth = 0,
  output,
  TextFieldProps,
  assistant,
  projectId,
  gitRef,
}: {
  depth?: number;
  output: OutputVariableYjs;
  TextFieldProps?: TextFieldProps;
  assistant: AssistantYjs;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();
  const runtimeVariable = getRuntimeOutputVariable(output);
  const { getRefOutputData, getOutputI18nName } = useCallAgentOutput({
    projectId,
    gitRef,
    assistant,
  });

  const render = () => {
    if (output.from?.type === 'output') {
      return <Typography>{getOutputI18nName(getRefOutputData(output?.from?.id || '')?.name || '')}</Typography>;
    }

    if (runtimeVariable) {
      return <Typography>{t(runtimeVariable.i18nKey)}</Typography>;
    }

    return (
      <TextField
        data-testid="output-name-cell"
        variant="standard"
        fullWidth
        hiddenLabel
        placeholder={t('outputVariableName')}
        value={output.name || ''}
        onChange={(e) => (output.name = e.target.value)}
        onClick={(e) => e.stopPropagation()}
        {...TextFieldProps}
      />
    );
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        gap: 1,
        border: 0,
        borderRadius: 1,
        whiteSpace: 'nowrap',
      }}>
      {runtimeVariable?.icon || (depth === 0 ? <Icon icon={VariableIcon} /> : undefined)}

      {render()}
    </Stack>
  );
}

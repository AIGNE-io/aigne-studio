import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import { Box, TextField, TextFieldProps, Typography } from '@mui/material';
import { sortBy } from 'lodash';

import { useCallAgentCustomOutputDialogState } from '../use-call-agent-output';
import { getRuntimeOutputVariable } from './type';

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

function findNameById(data: Record<string, any>, targetId: string): any {
  if (data[targetId]?.data?.name) {
    return data[targetId].data;
  }

  for (const key in data) {
    const item = data[key];

    if (item?.data?.properties) {
      const result = findNameById(item.data.properties, targetId);
      if (result) return result;
    }

    // // 检查 element
    // if (item?.data?.element?.properties) {
    //   const result = findNameById(item.data.element.properties, targetId);
    //   if (result) return result;
    // }
  }

  return undefined;
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
  const { onEdit } = useCallAgentCustomOutputDialogState(projectId, gitRef, assistant.id);
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

  if (output.from?.type === 'variable' && assistant.type === 'callAgent') {
    const agents = assistant.agents && sortBy(Object.values(assistant.agents), (i) => i.index);
    const agentInstanceId = output.from?.agentInstanceId;
    const outputVariableId = output.from?.outputVariableId;

    if (agentInstanceId) {
      const data = agents?.find((i) => i.data.instanceId === agentInstanceId);
      const agent = getFileById(data?.data.id!);

      if (outputVariableId) {
        const outputVariable = findNameById(agent?.outputVariables || {}, outputVariableId);
        if (outputVariable) {
          const runtimeVariable = getRuntimeOutputVariable(outputVariable);
          if (runtimeVariable) {
            return (
              <Box className="center" gap={0.5} justifyContent="flex-start">
                <Typography
                  sx={{ color: 'text.disabled' }}
                  onClick={() =>
                    onEdit?.(true, {
                      id: output.id,
                      agentInstanceId: agentInstanceId,
                      outputVariableId: outputVariableId,
                    })
                  }>
                  {t(runtimeVariable.i18nKey)}
                </Typography>
                <Box component={Icon} icon={ChevronDownIcon} width={15} sx={{ color: 'text.disabled' }} />
              </Box>
            );
          }

          return (
            <Box className="center" gap={0.5} justifyContent="flex-start">
              <Typography
                sx={{ color: 'text.disabled' }}
                onClick={() =>
                  onEdit?.(true, {
                    id: output.id,
                    agentInstanceId: agentInstanceId,
                    outputVariableId: outputVariableId,
                  })
                }>
                {outputVariable.name}
              </Typography>
              <Box component={Icon} icon={ChevronDownIcon} width={15} sx={{ color: 'text.disabled' }} />
            </Box>
          );
        }
      }

      return (
        <Box className="center" gap={0.5} justifyContent="flex-start">
          <Typography
            sx={{ color: 'text.disabled' }}
            onClick={() =>
              onEdit?.(true, {
                id: output.id,
                agentInstanceId: agentInstanceId,
                outputVariableId: outputVariableId,
              })
            }>
            全部输出
          </Typography>
          <Box component={Icon} icon={ChevronDownIcon} width={15} sx={{ color: 'text.disabled' }} />
        </Box>
      );
    }

    return null;
  }

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

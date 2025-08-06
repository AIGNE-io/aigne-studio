import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { cloneDeep, sortBy } from 'lodash';
import { useCallback, useMemo } from 'react';

import { useCallAgentOutputDialogStore } from '../../store/call-agent-output-dialog-store';
import { getOutputName, runtimeOutputVariables } from './output/type';

const useCallAgentOutput = ({
  projectId,
  gitRef,
  assistant,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
}) => {
  const { t } = useLocaleContext();
  const { getFileById } = useProjectStore(projectId, gitRef);

  const ids =
    assistant.type === 'callAgent'
      ? Object.values(assistant?.agents || {})
          .map((i) => i.data)
          .map((i) => i.id)
      : [];

  const getOutputs = useCallback(() => {
    if (assistant.type !== 'callAgent') return [];

    const agents = Object.values(assistant?.agents || {}).map((i) => i.data);
    return agents.flatMap((i) => {
      const callAgent = getFileById(i.id);
      return (callAgent?.outputVariables && sortBy(Object.values(callAgent.outputVariables), 'index')) || [];
    });
  }, [ids]);

  const appearance = runtimeOutputVariables.find((i) => i.group === 'appearance')?.outputs || [];

  const outputs = useMemo(() => {
    const list = getOutputs().map((item) => item.data);
    const map = new Map();
    list.forEach((i) => map.set(i.name, i)); // 去重

    return Array.from(map.values()).filter((i) => !appearance.find((r) => r.name === i.name)); // 过滤外观输出变量
  }, [getOutputs]);

  const outputsExist = useMemo(
    () =>
      new Set(
        Object.values(assistant.outputVariables ?? {})
          .map((i) => (i.data.from?.type === 'output' ? i.data.from?.id : undefined))
          .filter(isNonNullable)
      ),
    [cloneDeep(assistant.outputVariables)]
  );

  const getRefOutputId = useCallback(
    (id: string) => {
      const list = Object.values(assistant.outputVariables ?? {}).filter((i) => i.data.from?.type === 'output');
      return list.find((x) => x.data.from && 'id' in x.data.from && x.data.from.id === id)?.data?.id;
    },
    [cloneDeep(assistant.outputVariables)]
  );

  const getOutputI18nName = useCallback(
    (inputName: string) => {
      const text = getOutputName(inputName);
      return text?.isI18n ? t(text.text) : text.text;
    },
    [t]
  );

  const getRefOutputData = useCallback((id: string) => outputs.find((i) => i.id === id), [outputs]);

  return { outputs, outputsExist, getRefOutputId, getOutputI18nName, getRefOutputData };
};

interface CallAgentCustomOutputDialogState {
  open?: boolean;
  output?: {
    id?: string;
    agentInstanceId: string;
    outputVariableId?: string;
  };
  name?: string;
}

export const useCallAgentCustomOutputDialogState = (projectId: string, gitRef: string, agentId: string) => {
  const key = `${projectId}-${gitRef}-${agentId}`;
  const { states, updateState, resetState } = useCallAgentOutputDialogStore();
  const state = states[key] || {};

  const onOpen = useCallback(
    (open: boolean) => {
      updateState(key, (v) => ({ ...v, open }));
    },
    [key, updateState]
  );

  const onSetOutput = useCallback(
    (output: CallAgentCustomOutputDialogState['output']) => {
      updateState(key, (v) => ({ ...v, output }));
    },
    [key, updateState]
  );

  const onEdit = useCallback(
    (
      open: CallAgentCustomOutputDialogState['open'],
      output: CallAgentCustomOutputDialogState['output'],
      name?: string
    ) => {
      updateState(key, () => ({ open, output, name }));
    },
    [key, updateState]
  );

  const onReset = useCallback(() => {
    resetState(key);
  }, [key, resetState]);

  return {
    state,
    onOpen,
    onSetOutput,
    onEdit,
    onReset,
  };
};

export default useCallAgentOutput;

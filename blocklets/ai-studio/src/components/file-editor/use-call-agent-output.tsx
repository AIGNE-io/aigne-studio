import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { cloneDeep, sortBy } from 'lodash';
import { useCallback, useMemo } from 'react';

import { getOutputName } from './output/type';

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

  const id = assistant.type === 'callAgent' ? assistant.call?.id : undefined;
  const getOutputs = useCallback(() => {
    if (assistant.type === 'callAgent' && assistant.call) {
      const callAgent = getFileById(assistant.call.id);
      return (callAgent?.outputVariables && sortBy(Object.values(callAgent.outputVariables), 'index')) || [];
    }

    return [];
  }, [id]);

  const outputs = useMemo(() => getOutputs().map((item) => item.data), [getOutputs]);

  const outputsExist = useMemo(
    () =>
      new Set(
        Object.values(assistant.outputVariables ?? {})
          .filter((i) => i.data.from?.type === 'output')
          .map((i) => i.data.from?.id)
      ),
    [cloneDeep(assistant.outputVariables)]
  );

  const getRefOutputId = useCallback(
    (id: string) => {
      const list = Object.values(assistant.outputVariables ?? {}).filter((i) => i.data.from?.type === 'output');
      return list.find((x) => x.data.from?.id === id)?.data?.id;
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

export default useCallAgentOutput;

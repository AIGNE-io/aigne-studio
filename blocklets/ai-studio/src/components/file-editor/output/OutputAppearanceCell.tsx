import { AssistantYjs, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Chip } from '@mui/material';
import { useMemo } from 'react';

import useCallAgentOutput from '../use-call-agent-output';

export default function OutputAppearanceCell({
  output,
  projectId,
  gitRef,
  assistant,
}: {
  output: OutputVariableYjs;
  assistant: AssistantYjs;
  projectId: string;
  gitRef: string;
}) {
  const { getRefOutputData } = useCallAgentOutput({
    projectId,
    gitRef,
    assistant,
  });

  const appearance = useMemo(() => {
    if (output.from?.type === 'output') {
      return getRefOutputData(output?.from?.id || '')?.appearance;
    }

    return output?.appearance;
  }, [output.from?.type, output?.appearance]);

  if (!appearance) return null;
  if (!appearance?.componentName) return null;

  return <Chip className="ellipsis" label={appearance?.componentName} size="small" />;
}

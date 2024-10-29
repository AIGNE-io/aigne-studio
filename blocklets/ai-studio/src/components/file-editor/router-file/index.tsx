import { RouterAssistantYjs } from '@blocklet/ai-runtime/types';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { Stack, Switch } from '@mui/material';

import Branch from './branch';
import LLM from './llm';

export default function RouterAssistantEditor({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
  isRemoteCompare,
  openApis = [],
}: {
  projectId: string;
  gitRef: string;
  value: RouterAssistantYjs;
  compareValue?: RouterAssistantYjs;
  disabled?: boolean;
  isRemoteCompare?: boolean;
  openApis?: DatasetObject[];
}) {
  const props = {
    projectId,
    gitRef,
    value,
    compareValue,
    disabled,
    isRemoteCompare,
    openApis,
  };

  return (
    <Stack gap={1.5}>
      <Switch onChange={(e) => (value.conditionalBranch = !!e.target.checked)} />
      {value.conditionalBranch ? <Branch {...props} /> : <LLM {...props} />}
    </Stack>
  );
}

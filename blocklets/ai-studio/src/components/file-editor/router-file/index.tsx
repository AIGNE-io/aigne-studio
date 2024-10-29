import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RouterAssistantYjs } from '@blocklet/ai-runtime/types';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import { FormGroup, Stack, Typography } from '@mui/material';

import Switch from '../../custom/switch';
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
  const { t } = useLocaleContext();

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
      <FormGroup row sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        <Typography>{t('decision.AI')}</Typography>
        <Switch
          sx={{ mx: 1 }}
          checked={!!value.conditionalBranch}
          onChange={(e) => (value.conditionalBranch = !!e.target.checked)}
        />
        <Typography>{t('decision.branch')}</Typography>
      </FormGroup>

      {value.conditionalBranch ? <Branch {...props} /> : <LLM {...props} />}
    </Stack>
  );
}

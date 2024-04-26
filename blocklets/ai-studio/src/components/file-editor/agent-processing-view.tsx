import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

import AgentTypeSelect from './agent-type-select';

export default function AgentProcessingView({
  assistant,
  children,
}: {
  assistant: AssistantYjs;
  children?: ReactNode;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
        <Box component={Icon} icon="tabler:cpu" sx={{ color: '#3B82F6', fontSize: 15 }} />
        <Typography variant="subtitle2" sx={{ m: 0 }}>
          {t('processing')}
        </Typography>

        <Box flex={1} />

        <AgentTypeSelect assistant={assistant} />
      </Stack>

      {children}
    </Stack>
  );
}

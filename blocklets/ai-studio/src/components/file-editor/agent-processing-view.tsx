import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, isImageAssistant, isPromptAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

import AgentTypeSelect from './agent-type-select';
import Setting from './setting';

export default function AgentProcessingView({
  projectId,
  gitRef,
  assistant,
  children,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  children?: ReactNode;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack gap={1}>
      <Box className="between">
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box component={Icon} icon="tabler:brain" sx={{ fontSize: 15 }} />
          <Typography variant="subtitle2" sx={{ m: 0 }}>
            {t('processing')}
          </Typography>
          <Box>-</Box>
          <AgentTypeSelect assistant={assistant} />
        </Box>

        <Box>
          {(isPromptAssistant(assistant) || isImageAssistant(assistant)) && (
            <Setting projectId={projectId} gitRef={gitRef} value={assistant} />
          )}
        </Box>
      </Box>

      {children}
    </Stack>
  );
}

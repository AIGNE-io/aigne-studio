import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  isFunctionAssistant,
  isImageAssistant,
  isPromptAssistant,
  isRouterAssistant,
} from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import BrainIcon from '@iconify-icons/tabler/brain';
import { Box, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

import AgentTypeSelect, { agentTypesMap } from './agent-type-select';
import FunctionTypeSelect from './function-file/function-type-select';
import Setting from './setting';

export default function AgentProcessingView({
  projectId,
  gitRef,
  assistant,
  children = undefined,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  children?: ReactNode;
}) {
  const { t } = useLocaleContext();

  return (
    <Stack
      data-testid="agent-processing-view"
      sx={{
        gap: 1,
      }}>
      <Box
        className="between"
        sx={{
          whiteSpace: 'nowrap',
          gap: 2,
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            minHeight: 32,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
            {agentTypesMap[assistant.type]?.icon ?? <Box component={Icon} icon={BrainIcon} sx={{ fontSize: 15 }} />}
          </Box>
          <Typography component="span" variant="subtitle2" sx={{ m: 0, flexShrink: 1 }} noWrap>
            {t('processing')} -&nbsp;
          </Typography>
          <Stack
            direction="row"
            sx={{
              flex: 1,
              width: 0,
              minWidth: 20,
            }}>
            <AgentTypeSelect assistant={assistant} data-testid="agent-type-select" />
          </Stack>
        </Box>

        <Box data-testid="agent-setting">
          {isPromptAssistant(assistant) || isImageAssistant(assistant) || isRouterAssistant(assistant) ? (
            <Setting projectId={projectId} gitRef={gitRef} value={assistant} />
          ) : isFunctionAssistant(assistant) ? (
            <FunctionTypeSelect value="javascript" hiddenLabel SelectProps={{ autoWidth: true }} />
          ) : null}
        </Box>
      </Box>
      {children}
    </Stack>
  );
}

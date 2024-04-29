import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  isApiAssistant,
  isFunctionAssistant,
  isImageAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box, Stack } from '@mui/material';

import ArrowLine from '../../../pages/project/icons/line';
import AgentProcessingView from '../agent-processing-view';
import ApiAssistantEditor from '../api-assistant';
import BasicInfoForm from '../basic-info-form';
import FunctionAssistantEditor from '../function-file';
import ImageAssistantEditor from '../image-file';
import OutputSettings from '../output/output-settings';
import ParametersTable from '../parameters-table';
import PromptAssistantEditor from '../prompt-file';

export default function AgentEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: AssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  // const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack p={2.5} position="relative">
      <Box sx={{ mx: -1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box height={20} width={1} />

      <Box sx={{ borderRadius: 1 }}>
        <ParametersTable projectId={projectId} gitRef={gitRef} readOnly={disabled} value={value} />
      </Box>

      <Box height={20} width={1} position="relative">
        <Box position="absolute" left={20} top={-4}>
          <ArrowLine sx={{ width: 8, height: 36 }} />
        </Box>
      </Box>

      <Box sx={{ borderRadius: 1, bgcolor: '#EFF6FF', px: 2, py: 1.5 }}>
        <AgentProcessingView projectId={projectId} gitRef={gitRef} assistant={value}>
          {isPromptAssistant(value) ? (
            <PromptAssistantEditor projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
          ) : isImageAssistant(value) ? (
            <ImageAssistantEditor projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
          ) : isFunctionAssistant(value) ? (
            <FunctionAssistantEditor gitRef={gitRef} value={value} disabled={disabled} />
          ) : isApiAssistant(value) ? (
            <ApiAssistantEditor projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
          ) : (
            <Stack alignItems="center">
              <Box sx={{ fontSize: 28, color: 'text.disabled' }}>
                <Icon icon="tabler:zzz" />
              </Box>

              <Box sx={{ color: 'text.secondary' }}>{t('idleAgentDescription')}</Box>
            </Stack>
          )}
        </AgentProcessingView>
      </Box>

      <Box height={20} width={1} position="relative">
        <Box position="absolute" left={20} top={-4}>
          <ArrowLine sx={{ width: 8, height: 36 }} />
        </Box>
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <OutputSettings projectId={projectId} gitRef={gitRef} value={value} />
      </Box>
    </Stack>
  );
}

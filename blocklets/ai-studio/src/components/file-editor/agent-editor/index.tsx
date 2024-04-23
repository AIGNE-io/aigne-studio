import {
  AssistantYjs,
  isApiAssistant,
  isFunctionAssistant,
  isImageAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
import { Box, Stack } from '@mui/material';

import { useReadOnly } from '../../../contexts/session';
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
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <Stack gap={2.5} p={2.5}>
      <Box sx={{ mx: -1 }}>
        <BasicInfoForm projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <ParametersTable projectId={projectId} gitRef={gitRef} readOnly={disabled} value={value} />
      </Box>

      <Box sx={{ borderRadius: 1, bgcolor: '#EFF6FF', px: 2, py: 1.5 }}>
        <AgentProcessingView assistant={value}>
          {isPromptAssistant(value) ? (
            <PromptAssistantEditor projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
          ) : isImageAssistant(value) ? (
            <ImageAssistantEditor projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
          ) : isFunctionAssistant(value) ? (
            <FunctionAssistantEditor gitRef={gitRef} value={value} disabled={disabled} />
          ) : isApiAssistant(value) ? (
            <ApiAssistantEditor projectId={projectId} gitRef={gitRef} value={value} disabled={disabled} />
          ) : null}
        </AgentProcessingView>
      </Box>

      <Box sx={{ borderRadius: 1 }}>
        <OutputSettings value={value} readOnly={readOnly} />
      </Box>
    </Stack>
  );
}

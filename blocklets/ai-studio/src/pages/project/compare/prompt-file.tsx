import type { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack } from '@mui/material';

import PromptAssistantEditorPrompts from '../../../components/file-editor/prompt-file/prompts';
import PromptAssistantSetting from '../../../components/file-editor/prompt-file/setting';

export default function ComparePromptAssistant({
  projectId,
  gitRef,
  remoteAssistant,
  localeAssistant,
}: {
  projectId: string;
  gitRef: string;
  remoteAssistant: PromptAssistantYjs;
  localeAssistant: PromptAssistantYjs;
}) {
  return (
    <>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <PromptAssistantEditorPrompts
            projectId={projectId}
            gitRef={gitRef}
            value={remoteAssistant}
            compareValue={localeAssistant}
            isRemoteCompare
            disabled
          />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <PromptAssistantEditorPrompts
            projectId={projectId}
            gitRef={gitRef}
            value={localeAssistant}
            compareValue={remoteAssistant}
            disabled
          />
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column" gap={1.5}>
          <PromptAssistantSetting projectId={projectId} gitRef={gitRef} value={remoteAssistant} readOnly />
        </Box>

        <Box flex={1} display="flex" flexDirection="column" gap={1.5}>
          <PromptAssistantSetting
            projectId={projectId}
            gitRef={gitRef}
            value={localeAssistant}
            compareValue={remoteAssistant}
            readOnly
          />
        </Box>
      </Stack>
    </>
  );
}

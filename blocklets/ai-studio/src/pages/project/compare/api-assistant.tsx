import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack } from '@mui/material';

import ApiAssistantEditorAPI from '../../../components/file-editor/api-assistant/api-editor';
import ApiAssistantSetting from '../../../components/file-editor/api-assistant/setting';
import ApiAssistantEditorPrepare from '../../../components/file-editor/prepare';

export default function CompareAPIAssistant({
  projectId,
  gitRef,
  remoteAssistant,
  localeAssistant,
}: {
  projectId: string;
  gitRef: string;
  remoteAssistant: ApiAssistantYjs;
  localeAssistant: ApiAssistantYjs;
}) {
  return (
    <>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantEditorPrepare
            projectId={projectId}
            gitRef={gitRef}
            value={remoteAssistant}
            compareValue={localeAssistant}
            isRemoteCompare
            disabled
          />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantEditorPrepare
            projectId={projectId}
            gitRef={gitRef}
            value={localeAssistant}
            compareValue={remoteAssistant}
            disabled
          />
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantEditorAPI value={remoteAssistant} compareValue={localeAssistant} isRemoteCompare disabled />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantEditorAPI value={localeAssistant} compareValue={remoteAssistant} disabled />
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantSetting value={remoteAssistant} readOnly isOpen />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantSetting value={localeAssistant} compareValue={remoteAssistant} readOnly isOpen />
        </Box>
      </Stack>
    </>
  );
}

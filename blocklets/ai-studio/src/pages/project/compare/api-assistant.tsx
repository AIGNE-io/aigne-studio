import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack } from '@mui/material';

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
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
          <ApiAssistantEditorPrepare
            projectId={projectId}
            gitRef={gitRef}
            value={remoteAssistant}
            compareValue={localeAssistant}
            isRemoteCompare
            disabled
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
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
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
          <ApiAssistantSetting projectId={projectId} gitRef={gitRef} value={remoteAssistant} readOnly />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column"
          }}>
          <ApiAssistantSetting
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

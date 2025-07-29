import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack } from '@mui/material';

import ImageAssistantEditorFormatPrompt from '../../../components/file-editor/image-file/prompt';
import ImageAssistantSetting from '../../../components/file-editor/image-file/setting';
import ImageAssistantEditorPrepare from '../../../components/file-editor/prepare';

export default function CompareImagesAssistant({
  projectId,
  gitRef,
  remoteAssistant,
  localeAssistant,
}: {
  projectId: string;
  gitRef: string;
  remoteAssistant: ImageAssistantYjs;
  localeAssistant: ImageAssistantYjs;
}) {
  return (
    <>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
          <ImageAssistantEditorPrepare
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
            display: 'flex',
            flexDirection: 'column',
          }}>
          <ImageAssistantEditorPrepare
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
            display: 'flex',
            flexDirection: 'column',
          }}>
          <ImageAssistantEditorFormatPrompt projectId={projectId} gitRef={gitRef} value={remoteAssistant} disabled />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
          <ImageAssistantEditorFormatPrompt
            gitRef={gitRef}
            projectId={projectId}
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
            display: 'flex',
            flexDirection: 'column',
          }}>
          <ImageAssistantSetting projectId={projectId} gitRef={gitRef} value={remoteAssistant} readOnly />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
          <ImageAssistantSetting
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

import { ImageAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack, alpha } from '@mui/material';

import ImageAssistantEditorPrepare from '../../../components/file-editor/image-file/prepare';
import ImageAssistantEditorFormatPrompt from '../../../components/file-editor/image-file/prompt';
import ImageAssistantSetting from '../../../components/file-editor/image-file/setting';

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
        <Box flex={1} display="flex" flexDirection="column">
          <ImageAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={remoteAssistant} disabled />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ImageAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={localeAssistant} disabled />
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <Box
            sx={{
              border: 2,
              borderColor: 'primary.main',
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
            }}>
            <ImageAssistantEditorFormatPrompt gitRef={gitRef} value={remoteAssistant} disabled />
          </Box>
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <Box
            sx={{
              border: 2,
              borderColor: 'primary.main',
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
            }}>
            <ImageAssistantEditorFormatPrompt gitRef={gitRef} value={localeAssistant} disabled />
          </Box>
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <ImageAssistantSetting projectId={projectId} gitRef={gitRef} value={remoteAssistant} readOnly />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ImageAssistantSetting projectId={projectId} gitRef={gitRef} value={localeAssistant} readOnly />
        </Box>
      </Stack>
    </>
  );
}

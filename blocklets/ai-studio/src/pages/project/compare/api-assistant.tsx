import { ApiAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack, alpha } from '@mui/material';

import ApiAssistantEditorAPI from '../../../components/file-editor/api-assistant/api';
import ApiAssistantEditorPrepare from '../../../components/file-editor/api-assistant/prepare';
import ApiAssistantSetting from '../../../components/file-editor/api-assistant/setting';

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
          <ApiAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={remoteAssistant} disabled />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={localeAssistant} disabled />
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
            <ApiAssistantEditorAPI value={remoteAssistant} disabled />
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
            <ApiAssistantEditorAPI value={localeAssistant} disabled />
          </Box>
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantSetting value={remoteAssistant} readOnly />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ApiAssistantSetting value={localeAssistant} readOnly />
        </Box>
      </Stack>
    </>
  );
}

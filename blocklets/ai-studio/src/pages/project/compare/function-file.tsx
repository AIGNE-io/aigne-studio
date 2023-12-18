import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Divider, Stack, alpha } from '@mui/material';

import FunctionCodeEditor from '../../../components/file-editor/function-file/function-code-editor';
import FunctionAssistantEditorPrepare from '../../../components/file-editor/function-file/prepare';
import FunctionAssistantSetting from '../../../components/file-editor/function-file/setting';

export default function CompareFunctionAssistant({
  projectId,
  gitRef,
  remoteAssistant,
  localeAssistant,
}: {
  projectId: string;
  gitRef: string;
  remoteAssistant: FunctionAssistantYjs;
  localeAssistant: FunctionAssistantYjs;
}) {
  return (
    <>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <FunctionAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={remoteAssistant} disabled />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <FunctionAssistantEditorPrepare projectId={projectId} gitRef={gitRef} value={localeAssistant} disabled />
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
            <FunctionCodeEditor value={remoteAssistant} readOnly />
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
            <FunctionCodeEditor value={localeAssistant} readOnly />
          </Box>
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <FunctionAssistantSetting />
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <FunctionAssistantSetting />
        </Box>
      </Stack>
    </>
  );
}

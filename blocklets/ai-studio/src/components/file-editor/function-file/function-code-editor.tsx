import LogsContainer from '@app/components/logs-container';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Stack, Typography, alpha } from '@mui/material';
import { useEffect } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import CodeEditor from '../../template-form/code-editor';

export default function FunctionCodeEditor({
  value,
  readOnly,
  compareValue,
  isRemoteCompare,
  showConsole = false,
}: {
  value: FunctionAssistantYjs;
  readOnly?: boolean;
  compareValue?: FunctionAssistantYjs;
  showConsole?: boolean;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  useEffect(() => {
    if (!value.code) {
      value.code = `\
module.exports.default = async function(args) {
  return {
    // result
  }
}
`;
    }
  }, [value]);

  return (
    <Box
      sx={{
        border: 2,
        borderColor: 'primary.main',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
        overflow: 'hidden',
        backgroundColor: getDiffBackground('code'),
      }}>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />
        <Typography variant="subtitle1">{t('function')}</Typography>
      </Stack>

      <Box
        sx={{
          zIndex: (theme) => theme.zIndex.tooltip,
          height: '300px',
          '.monaco-editor': {
            borderBottomLeftRadius: (theme) => (showConsole ? 0 : theme.shape.borderRadius * 2),
            borderBottomRightRadius: (theme) => (showConsole ? 0 : theme.shape.borderRadius * 2),
            '.overflow-guard': {
              borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 2,
              borderBottomRightRadius: (theme) => theme.shape.borderRadius * 2,
              backgroundColor: getDiffBackground('code'),
            },
            backgroundColor: getDiffBackground('code'),
          },
        }}>
        <CodeEditor
          readOnly={readOnly}
          language="javascript"
          path="function.js"
          value={value.code}
          onChange={(code) => (value.code = code)}
        />
      </Box>
      {showConsole && <LogsContainer />}
    </Box>
  );
}

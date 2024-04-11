import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import TipsAndUpdatesRounded from '../../../pages/project/icons/tips';
import CodeEditor from '../../template-form/code-editor';

export default function FunctionCodeEditor({
  value,
  readOnly,
  compareValue,
  isRemoteCompare,
}: {
  value: FunctionAssistantYjs;
  readOnly?: boolean;
  compareValue?: FunctionAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  useEffect(() => {
    if (!value.code) {
      value.code = `\
export default async function (args) {
  return {
    // result
  }
}`;
    }
  }, [value]);

  return (
    <Stack
      gap={1}
      sx={{
        borderRadius: 1,
        bgcolor: '#EFF6FF',
        px: 2,
        py: 1.5,
      }}>
      <Stack direction="row" alignItems="center" sx={{ gap: 1 }}>
        <TipsAndUpdatesRounded sx={{ color: '#3B82F6', fontSize: 15 }} />
        <Typography variant="subtitle2" mb={0}>
          {t('function')}
        </Typography>
      </Stack>

      <Box border="1px solid #3B82F6" borderRadius={1} bgcolor="background.paper" px={1.5} py={1}>
        <Box
          sx={{
            zIndex: (theme) => theme.zIndex.tooltip,
            height: '300px',
            '.monaco-editor': {
              borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 2,
              borderBottomRightRadius: (theme) => theme.shape.borderRadius * 2,
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
            language="typescript"
            path="function.ts"
            value={value.code}
            onChange={(code) => (value.code = code)}
          />
        </Box>
      </Box>
    </Stack>
  );
}

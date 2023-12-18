import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';

import CodeEditor from '../../template-form/code-editor';

export default function FunctionCodeEditor({ value, readOnly }: { value: FunctionAssistantYjs; readOnly?: boolean }) {
  const { t } = useLocaleContext();

  useEffect(() => {
    if (!value.code) {
      value.code = `\
module.exports.default = async function(args) {
  console.log(args)
  return {
    // result
  }
}
`;
    }
  }, [value]);

  return (
    <>
      <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
        <TipsAndUpdatesRounded fontSize="small" color="primary" />
        <Typography variant="subtitle1">{t('function')}</Typography>
      </Stack>

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
            },
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
    </>
  );
}

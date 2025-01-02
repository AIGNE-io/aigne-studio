import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { CodeEditor } from '@blocklet/code-editor';
import { Box, Stack } from '@mui/material';
import { useEffect } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

export default function FunctionCodeEditor({
  projectId,
  gitRef,
  value,
  readOnly,
  compareValue,
  isRemoteCompare,
}: {
  projectId: string;
  gitRef: string;
  value: FunctionAssistantYjs;
  readOnly?: boolean;
  compareValue?: FunctionAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const { locale } = useLocaleContext();

  useEffect(() => {
    if (!value.code) {
      value.code = `\
return {
  text: 'hello, AIGNE!'
}
`;
    }
  }, [value]);

  return (
    <Stack
      gap={1}
      sx={{
        borderRadius: 1,
        bgcolor: '#EFF6FF',
      }}>
      <Box
        key={`${projectId}-${gitRef}-${value.id}`}
        border="1px solid #3B82F6"
        borderRadius={1}
        bgcolor="background.paper"
        sx={{
          minHeight: '300px',
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
          keyId={`${projectId}-${gitRef}-${value.id}`}
          readOnly={readOnly}
          language="typescript"
          path="function.ts"
          value={value.code}
          onChange={(code) => (value.code = code)}
          locale={locale}
        />
      </Box>
    </Stack>
  );
}

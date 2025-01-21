import { useUploader } from '@app/contexts/uploader';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { FunctionAssistantYjs } from '@blocklet/ai-runtime/types';
import { CodeEditor } from '@blocklet/code-editor';
import { Box, Stack } from '@mui/material';
import { useEffect, useRef } from 'react';
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

  const uploaderRef = useUploader();
  const codeEditorUploadCallback = useRef<((url: string) => void) | null>(null);

  const handleOpen = () => {
    const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const uploader = uploaderRef?.current?.getUploader();
    if (uploader?.opts?.restrictions?.allowedFileTypes) {
      uploader.opts.restrictions.allowedFileTypes = allowedFileTypes;
    }

    uploader?.open();

    if (codeEditorUploadCallback.current) {
      // rewrite default emitter
      uploader.onceUploadSuccess(({ response }: any) => {
        const url = response?.data?.url || response?.data?.fileUrl;
        codeEditorUploadCallback.current?.(url);
      });
    }
  };

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
          onUpload={(callback) => {
            codeEditorUploadCallback.current = callback;
            handleOpen();
          }}
        />
      </Box>
    </Stack>
  );
}

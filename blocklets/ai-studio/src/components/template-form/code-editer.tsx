import Editor, { EditorProps, useMonaco } from '@monaco-editor/react';
import { Box, useTheme } from '@mui/material';
import { useEffect } from 'react';

export default function CodeEditor({ readOnly, ...props }: { readOnly?: boolean } & EditorProps) {
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('customTheme', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#F2F2F2',
        },
      });
      monaco.editor.setTheme('customTheme');
    }
  }, [monaco]);

  const theme = useTheme();

  return (
    <Box
      {...props}
      component={Editor}
      height="120px"
      theme="customTheme"
      sx={{ overflow: 'hidden', borderRadius: `${theme.shape.borderRadius}px` }}
      options={{
        lineNumbersMinChars: 2,
        minimap: { enabled: false },
        readOnly,
        tabSize: 2,
        insertSpaces: true,
      }}
    />
  );
}

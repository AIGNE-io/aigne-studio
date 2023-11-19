import Editor, { EditorProps, useMonaco } from '@monaco-editor/react';
import { Box, useTheme } from '@mui/material';
import { customAlphabet } from 'nanoid';
import { useEffect } from 'react';

const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

export default function CodeEditor({ readOnly, ...props }: { readOnly?: boolean } & EditorProps) {
  const monaco = useMonaco();
  const id = randomId();
  const themeName = `customTheme${id}`;

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme(themeName, {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#F2F2F2',
        },
      });
      monaco.editor.setTheme(themeName);
    }
  }, [monaco, themeName]);

  const theme = useTheme();

  return (
    <Box
      {...props}
      component={Editor}
      height="120px"
      theme={themeName}
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

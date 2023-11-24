import Editor, { EditorProps, useMonaco } from '@monaco-editor/react';
import { Box, useTheme } from '@mui/material';
import { customAlphabet } from 'nanoid';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

const CodeEditor = forwardRef(({ readOnly, ...props }: { readOnly?: boolean } & EditorProps, ref) => {
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

  useImperativeHandle(ref, () => monaco?.editor);

  return (
    <Box
      loading={
        <Box
          sx={{
            height: props.height || '120px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#F2F2F2',
            width: '100%',
            color: (theme) => theme.palette.grey[500],
            fontSize: '14px',
          }}>
          <Box>Loading...</Box>
        </Box>
      }
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
      {...props}
    />
  );
});

export default CodeEditor;

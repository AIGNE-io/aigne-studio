import Editor, { useMonaco } from '@monaco-editor/react';
import { Box, BoxProps, useTheme } from '@mui/material';
import { customAlphabet } from 'nanoid';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

const CodeEditor = forwardRef(({ readOnly, ...props }: { readOnly?: boolean } & BoxProps<typeof Editor>, ref) => {
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

  useImperativeHandle(ref, () => {});

  const theme = useTheme();

  return (
    <Box
      component={Editor}
      theme={themeName}
      {...props}
      sx={{ '.overflowingContentWidgets': { position: 'relative', zIndex: theme.zIndex.tooltip }, ...props.sx }}
      options={{
        lineNumbersMinChars: 2,
        scrollBeyondLastLine: false,
        padding: { bottom: 100 },
        minimap: { enabled: false },
        readOnly,
        tabSize: 2,
        insertSpaces: true,
        fixedOverflowWidgets: true,
        contextmenu: false,
        ...props.options,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          ...props.options?.scrollbar,
        },
      }}
    />
  );
});

export default CodeEditor;

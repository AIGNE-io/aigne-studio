import Editor, { useMonaco } from '@monaco-editor/react';
import { Box, BoxProps, useTheme } from '@mui/material';
import { customAlphabet } from 'nanoid';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

const CodeEditor = forwardRef(
  ({ readOnly, variables, ...props }: { variables: string[]; readOnly?: boolean } & BoxProps<typeof Editor>, ref) => {
    const monaco = useMonaco();
    const id = randomId();
    const themeName = `customTheme${id}`;

    useEffect(() => {
      if (monaco) {
        monaco.editor.defineTheme(themeName, {
          base: 'vs',
          inherit: true,
          rules: [],
          colors: { 'editor.background': '#F2F2F2' },
        });
        monaco.editor.setTheme(themeName);
      }
    }, [monaco, themeName]);

    useEffect(() => {
      let provider: any;

      if (monaco) {
        provider = monaco.languages.registerCompletionItemProvider('javascript', {
          provideCompletionItems(model, position) {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            return {
              suggestions: variables.map((variable) => ({
                label: variable,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: variable,
                range,
                sortText: '0',
              })),
            };
          },
        });
      }

      return () => {
        if (provider) {
          provider.dispose();
        }
      };
    }, [monaco, variables]);

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
  }
);

export default CodeEditor;

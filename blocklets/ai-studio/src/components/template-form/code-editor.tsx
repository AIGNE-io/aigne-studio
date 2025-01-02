import Editor, { useMonaco } from '@monaco-editor/react';
import type { BoxProps } from '@mui/material';
import { Box, useTheme } from '@mui/material';
import type Monaco from 'monaco-editor';
import { customAlphabet } from 'nanoid';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
const id = randomId();
const themeName = `customTheme${id}`;
const prettier = Promise.all([
  import('prettier'),
  import('prettier/plugins/typescript'),
  import('prettier/plugins/estree'),
]);

const formatCode = async (code: string) => {
  return prettier.then(async ([prettier, typescriptPlugin, estreePlugin]) => {
    return prettier.format(code, {
      parser: 'typescript',
      plugins: [typescriptPlugin, estreePlugin.default],
      printWidth: 120,
      useTabs: false,
      tabWidth: 2,
      trailingComma: 'es5',
      bracketSameLine: true,
      semi: true,
      singleQuote: true,
    });
  });
};

let monacoConfigured = false;

function setupMonaco(monaco: typeof Monaco) {
  if (monacoConfigured) return;
  monacoConfigured = true;

  monaco.languages.registerDocumentFormattingEditProvider(['javascript', 'typescript'], {
    async provideDocumentFormattingEdits(model) {
      return [
        {
          range: model.getFullModelRange(),
          text: await formatCode(model.getValue()),
        },
      ];
    },
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: true, // This line disables errors in jsx tags like <div>, etc.
  });

  monaco.editor.defineTheme(themeName, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
    },
  });
  monaco.editor.setTheme(themeName);
}

const CodeEditor = forwardRef(
  ({ readOnly, maxHeight, ...props }: { readOnly?: boolean; maxHeight?: number } & BoxProps<typeof Editor>, ref) => {
    const monaco = useMonaco();

    useEffect(() => {
      if (monaco) {
        setupMonaco(monaco);
      }
    }, [monaco]);

    useImperativeHandle(ref, () => {});

    const theme = useTheme();

    return (
      <Box
        component={Editor}
        theme={themeName}
        {...props}
        sx={{
          '--vscode-menu-background': 'rgba(255,255,255,1)',
          '--vscode-widget-shadow': 'rgba(0,0,0,0.1)',
          '.overflowingContentWidgets': { position: 'relative', zIndex: theme.zIndex.tooltip },
          ...props.sx,
        }}
        options={{
          lineNumbersMinChars: 2,
          formatOnPaste: true,
          scrollBeyondLastLine: false,
          padding: { bottom: 100 },
          minimap: { enabled: false },
          readOnly,
          tabSize: 2,
          insertSpaces: true,
          fixedOverflowWidgets: true,
          contextmenu: true,
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

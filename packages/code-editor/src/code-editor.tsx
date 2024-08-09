import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import FullMaxIcon from '@iconify-icons/tabler/arrows-maximize';
import FullMinIcon from '@iconify-icons/tabler/arrows-minimize';
import SettingIcon from '@iconify-icons/tabler/settings';
import Editor, { useMonaco } from '@monaco-editor/react';
import { Box, BoxProps, IconButton, styled, useTheme } from '@mui/material';
import useLocalStorageState from 'ahooks/lib/useLocalStorageState';
import { editor } from 'monaco-editor';
import { customAlphabet } from 'nanoid';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';

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

function setupMonaco(monaco: typeof import('monaco-editor')) {
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
    const [editor, setEditor] = useState<ReturnType<(typeof import('monaco-editor'))['editor']['create']>>();
    const monaco = useMonaco();
    const theme = useTheme();
    const handle = useFullScreenHandle();
    const [settings, setSettings] = useLocalStorageState<{ vim: boolean; vimMode?: 'insert' | 'normal' }>(
      `editor-${id}`,
      { defaultValue: { vim: false, vimMode: undefined } }
    );

    const statusRef = useRef<HTMLElement>(null);
    const vimModeRef = useRef<any>();

    useEffect(() => {
      if (monaco) setupMonaco(monaco);
    }, [monaco]);

    useEffect(() => {
      if (settings?.vim) {
        if (editor) {
          import('monaco-vim').then(({ initVimMode }) => {
            vimModeRef.current = initVimMode(editor, statusRef.current!);
            setSettings((r) => ({ ...r!, vimMode: 'normal' }));
            vimModeRef.current.on('vim-mode-change', ({ mode }: any) => setSettings((r) => ({ ...r!, vimMode: mode })));
          });
        }
      } else {
        vimModeRef.current?.dispose();
      }
    }, [settings?.vim, editor]);

    useEffect(() => {
      return () => vimModeRef.current?.dispose();
    }, []);

    useImperativeHandle(ref, () => {});

    return (
      <Full handle={handle}>
        <Box
          className={cx(props.className, settings?.vimMode === 'normal' && 'vim-normal')}
          component={Editor}
          theme={themeName}
          {...props}
          sx={{
            '.monaco-editor:focus': {
              outline: 'none !important',
            },
            '--vscode-menu-background': 'rgba(255,255,255,1)',
            '--vscode-widget-shadow': 'rgba(0,0,0,0.1)',
            '.overflowingContentWidgets': { position: 'relative', zIndex: theme.zIndex.tooltip },
            ...props.sx,
            '&.vim-normal .cursor.monaco-mouse-cursor-text':
              settings?.vimMode === 'normal'
                ? {
                    width: '9px !important',
                    backgroundColor: '#aeafad',
                    borderColor: '#aeafad',
                    color: '#515052',
                    opacity: 0.7,
                  }
                : {},
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
          onMount={(editor: editor.IStandaloneCodeEditor) => {
            setEditor(editor);
          }}
        />

        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Box ref={statusRef} sx={{ fontSize: 12, color: 'action.active' }} />
        </Box>

        <Box
          className="settings"
          sx={{ position: 'absolute', right: 20, top: 0, zIndex: 1, display: 'none', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={handle.active ? handle.exit : handle.enter}>
            <Box
              component={Icon}
              icon={handle.active ? FullMinIcon : FullMaxIcon}
              sx={{ color: 'action.active', fontSize: 20 }}
            />
          </IconButton>

          <IconButton size="small" onClick={() => setSettings((r) => ({ ...r!, vim: !r?.vim }))}>
            <Box component={Icon} icon={SettingIcon} sx={{ color: 'action.active', fontSize: 20 }} />
          </IconButton>
        </Box>
      </Full>
    );
  }
);

const Full = styled(FullScreen)`
  width: 100%;
  height: 100%;
  position: relative;

  &:hover {
    .settings {
      display: flex;
    }
  }
`;

export default CodeEditor;

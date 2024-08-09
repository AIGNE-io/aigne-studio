import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import FullMaxIcon from '@iconify-icons/tabler/arrows-diagonal';
import FullMinIcon from '@iconify-icons/tabler/arrows-diagonal-minimize-2';
import SettingIcon from '@iconify-icons/tabler/settings';
import XIcon from '@iconify-icons/tabler/x';
import Editor, { useMonaco } from '@monaco-editor/react';
import {
  Box,
  BoxProps,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  styled,
  useTheme,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import useLocalStorageState from 'ahooks/lib/useLocalStorageState';
import { get } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { editor } from 'monaco-editor';
import { customAlphabet } from 'nanoid';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';

import { translations } from '../locales';
import Switch from './components/switch';

const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
const id = randomId();
const themeName = `customTheme${id}`;
const prettier = Promise.all([
  import('prettier'),
  import('prettier/plugins/typescript'),
  import('prettier/plugins/estree'),
]);

function useMobileWidth() {
  const theme = useTheme();
  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
  const minWidth = isBreakpointsDownSm ? 300 : theme.breakpoints.values.sm;
  return { minWidth };
}

const useLocaleContext = (locale: string) => {
  return {
    t: (key: string) => {
      const translation = (translations as any)[locale];
      const translationValue = get(translation, key);
      return translationValue;
    },
  };
};

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
  (
    {
      readOnly,
      maxHeight,
      locale = 'en',
      ...props
    }: { readOnly?: boolean; maxHeight?: number; locale: string } & BoxProps<typeof Editor>,
    ref
  ) => {
    const { t } = useLocaleContext(locale);
    const [editor, setEditor] = useState<ReturnType<(typeof import('monaco-editor'))['editor']['create']>>();
    const monaco = useMonaco();
    const theme = useTheme();
    const handle = useFullScreenHandle();
    const [settings, setSettings] = useLocalStorageState<{ vim: boolean; vimMode?: 'insert' | 'normal' }>(
      'editor.vim.enable',
      { defaultValue: { vim: false, vimMode: undefined } }
    );
    const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));
    const { minWidth } = useMobileWidth();
    const dialogState = usePopupState({ variant: 'dialog' });

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

    const editorRender = () => {
      return (
        <Container>
          <Box
            className={cx(props.className, settings?.vimMode === 'normal' && 'vim-normal')}
            component={Editor}
            theme={themeName}
            {...props}
            sx={{
              '.monaco-editor': { outline: 'none !important' },
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
            sx={{
              position: 'absolute',
              right: 20,
              top: 0,
              zIndex: 1,
              display: 'none',
              alignItems: 'center',
              gap: 0.5,
            }}>
            <IconButton size="small" onClick={handle.active ? handle.exit : handle.enter}>
              <Box
                component={Icon}
                icon={handle.active ? FullMinIcon : FullMaxIcon}
                sx={{ color: 'action.active', fontSize: 20 }}
              />
            </IconButton>

            {!handle.active && (
              <IconButton size="small" onClick={() => dialogState.open()}>
                <Box component={Icon} icon={SettingIcon} sx={{ color: 'action.active', fontSize: 20 }} />
              </IconButton>
            )}
          </Box>
        </Container>
      );
    };

    return (
      <>
        <Full handle={handle}>
          {handle.active ? <FullScreenContainer locale={locale}>{editorRender()}</FullScreenContainer> : editorRender()}
        </Full>

        <Settings component="form" fullScreen={isBreakpointsDownSm} style={{ minWidth }} {...bindDialog(dialogState)}>
          <DialogTitle className="between">
            <Box>{t('settings')}</Box>
            <IconButton size="small" onClick={() => dialogState.close()}>
              <Box component={Icon} icon={XIcon} sx={{ color: 'action.active', fontSize: 20 }} />
            </IconButton>
          </DialogTitle>

          <DialogContent style={{ minWidth }}>
            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ p: 2 }} className="between">
                <Box className="key">{t('vim')}</Box>
                <Box>
                  <Switch
                    checked={Boolean(settings?.vim ?? false)}
                    onChange={(_, checked) => setSettings((r) => ({ ...r!, vim: checked }))}
                  />
                </Box>
              </Box>

              <Divider />

              <Box sx={{ p: 2 }} className="between">
                <Box className="key">{t('format')}</Box>
                <Box sx={{ color: 'action.disabled', fontSize: 12 }}>Shift + Alt/Option + F</Box>
              </Box>
            </Box>
          </DialogContent>
        </Settings>
      </>
    );
  }
);

const Full = styled(FullScreen)`
  width: 100%;
  height: 100%;
  position: relative;
`;

const Container = styled(Box)`
  width: 100%;
  height: 100%;
  position: relative;

  &:hover {
    .settings {
      display: flex;
    }
  }
`;

const Settings = styled(Dialog)`
  .between {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .key {
    font-weight: 500;
    font-size: 14px;
  }
`;

function FullScreenContainer({ locale, children }: { locale: string; children: React.ReactNode }) {
  const { t } = useLocaleContext(locale);

  return (
    <Stack gap={1} sx={{ borderRadius: 1, bgcolor: '#EFF6FF', px: 2, py: 1.5, width: 1, height: 1 }}>
      <Box className="between" whiteSpace="nowrap" gap={2}>
        <Box
          display="flex"
          alignItems="center"
          gap={0.5}
          minHeight={32}
          width={1}
          overflow="hidden"
          textOverflow="ellipsis">
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>{t('editor')}</Box>
        </Box>
      </Box>

      <Stack
        height={0}
        flex={1}
        gap={1}
        sx={{
          borderRadius: 1,
          bgcolor: '#EFF6FF',
        }}>
        <Box
          border="1px solid #3B82F6"
          borderRadius={1}
          bgcolor="background.paper"
          px={1.5}
          py={1}
          width={1}
          height={1}>
          <Box
            sx={{
              width: 1,
              height: 1,
              zIndex: (theme) => theme.zIndex.tooltip,
              '.monaco-editor': {
                borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 2,
                borderBottomRightRadius: (theme) => theme.shape.borderRadius * 2,
                '.overflow-guard': {
                  borderBottomLeftRadius: (theme) => theme.shape.borderRadius * 2,
                  borderBottomRightRadius: (theme) => theme.shape.borderRadius * 2,
                },
              },
            }}>
            {children}
          </Box>
        </Box>
      </Stack>
    </Stack>
  );
}

export default CodeEditor;

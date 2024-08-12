import 'react-resizable/css/styles.css';

import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import FullMaxIcon from '@iconify-icons/tabler/arrows-diagonal';
import FullMinIcon from '@iconify-icons/tabler/arrows-diagonal-minimize-2';
import LogosVim from '@iconify-icons/tabler/brand-vimeo';
import ChecksIcon from '@iconify-icons/tabler/checks';
import SettingIcon from '@iconify-icons/tabler/settings';
import XIcon from '@iconify-icons/tabler/x';
import Editor, { useMonaco } from '@monaco-editor/react';
import {
  Box,
  BoxProps,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  styled,
  useTheme,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import useLocalStorageState from 'ahooks/lib/useLocalStorageState';
import { get } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { editor } from 'monaco-editor';
import { customAlphabet } from 'nanoid';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import { ResizableBox } from 'react-resizable';

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
        <Container sx={{ overflow: 'hidden', borderRadius: 1 }}>
          <Box flex={1} height={0} p={1}>
            <Resizable
              width={Infinity}
              height={300}
              resizeHandles={['se']}
              axis="y"
              minConstraints={[Infinity, 300]}
              maxConstraints={[Infinity, 1000]}
              style={{ width: '100%' }}>
              <Box
                className={cx(props.className, settings?.vim && settings?.vimMode === 'normal' && 'vim-normal')}
                component={Editor}
                theme={themeName}
                {...props}
                sx={{
                  width: 1,
                  height: 1,
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
                onMount={(editor: editor.IStandaloneCodeEditor) => setEditor(editor)}
              />
            </Resizable>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1,
              gap: 1,
              backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
              boxShadow:
                theme.palette.mode === 'dark' ? '0 1px 3px rgba(0, 0, 0, 0.7)' : '0 1px 5px rgba(0, 0, 0, 0.1)',
              zIndex: 1,
              color: '#999',
              py: 0.25,
              // borderTop: '1px solid rgba(0, 0, 0, 0.1)',
            }}>
            <Box sx={{ flex: 1 }}>
              <Box ref={statusRef} sx={{ fontSize: 10, width: 1, mt: '1px', color: '#999' }} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, zIndex: 1, alignItems: 'center' }}>
              {settings?.vim && (
                <Tooltip title={t('vimEnable')}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box component={Icon} icon={LogosVim} sx={{ fontSize: 14, color: '#999' }} />
                  </Box>
                </Tooltip>
              )}

              <IconButton
                size="small"
                onClick={(e) => {
                  if (props.value) {
                    formatCode(props.value).then((value) => props.onChange?.(value, e as any));
                  }
                }}
                sx={{ borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box component={Icon} icon={ChecksIcon} sx={{ fontSize: 16, color: '#999' }} />
                  <Box sx={{ fontSize: 12, color: '#999' }}>{t('prettier')}</Box>
                </Box>
              </IconButton>

              <IconButton size="small" onClick={handle.active ? handle.exit : handle.enter}>
                <Box
                  component={Icon}
                  icon={handle.active ? FullMinIcon : FullMaxIcon}
                  sx={{ color: '#999', fontSize: 16 }}
                />
              </IconButton>

              {!handle.active && (
                <IconButton size="small" onClick={() => dialogState.open()}>
                  <Box component={Icon} icon={SettingIcon} sx={{ color: 'action.active', fontSize: 20 }} />
                </IconButton>
              )}
            </Box>
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
              <Box sx={{ p: 1 }} className="between">
                <Box className="key">{t('vim')}</Box>
                <Box>
                  <Switch
                    checked={Boolean(settings?.vim ?? false)}
                    onChange={(_, checked) => {
                      setSettings((r) => ({ ...r!, vim: checked }));
                      dialogState.close();
                    }}
                  />
                </Box>
              </Box>

              {/* <Divider />

              <Box sx={{ p: 2 }} className="between">
                <Box className="key">{t('format')}</Box>
                <Box sx={{ color: 'action.disabled', fontSize: 12 }}>Shift + Alt/Option + F</Box>
              </Box> */}
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

const Container = styled(Stack)`
  width: 100%;
  height: 100%;
  position: relative;
`;

const Resizable = styled(ResizableBox)`
  .react-resizable-handle-se {
    background: transparent;

    &::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(135deg, #bdbdbd, #bdbdbd 1px, transparent 2px, transparent 4px);
      clip-path: polygon(100% 0, 0 100%, 100% 100%);
      cursor: se-resize;
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

  .MuiDialogTitle-root {
    padding: 16px;
  }

  .MuiDialogContent-root {
    padding: 16px !important;
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

      <Stack height={0} flex={1} gap={1} sx={{ borderRadius: 1, bgcolor: '#EFF6FF' }}>
        <Box
          border="1px solid #3B82F6"
          borderRadius={1}
          bgcolor="background.paper"
          width={1}
          height={1}
          sx={{ zIndex: (theme) => theme.zIndex.tooltip }}>
          {children}
        </Box>
      </Stack>
    </Stack>
  );
}

export default CodeEditor;

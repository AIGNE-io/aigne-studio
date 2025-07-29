/// <reference path="../env.d.ts" />

import 'react-resizable/css/styles.css';

import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import FullMaxIcon from '@iconify-icons/tabler/arrows-diagonal';
import FullMinIcon from '@iconify-icons/tabler/arrows-diagonal-minimize-2';
import LogosVim from '@iconify-icons/tabler/brand-vimeo';
import ChecksIcon from '@iconify-icons/tabler/checks';
import CloudUploadIcon from '@iconify-icons/tabler/cloud-upload';
import SettingIcon from '@iconify-icons/tabler/settings';
import XIcon from '@iconify-icons/tabler/x';
import XBoxIcon from '@iconify-icons/tabler/xbox-x';
import Editor, { Monaco } from '@monaco-editor/react';
import {
  Box,
  BoxProps,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  Tooltip,
  styled,
  useTheme,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useUpdate } from 'ahooks';
import useLocalStorageState from 'ahooks/lib/useLocalStorageState';
import yaml from 'js-yaml';
import { debounce } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { editor } from 'monaco-editor';
import { VimMode } from 'monaco-vim';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ResizableBox } from 'react-resizable';

import { FullScreen, FullScreenOptions, useFullScreenHandle } from './components/react-full-screen';
import type { EditorInstance } from './libs/type';
import useAutoCloseTag from './plugins/close-tag';
import useEmmet from './plugins/emmet';
import useLocaleContext from './plugins/locale';
import usePrettier from './plugins/prettier';

const useVimMode = (
  editorInstance: EditorInstance,
  statusRef: React.RefObject<HTMLElement | null>,
  settings: { vim?: boolean; vimMode?: 'insert' | 'normal' },
  setSettings: any
) => {
  const vimModeRef = useRef<any>(undefined);
  const update = useUpdate();

  useEffect(() => {
    if (settings?.vim && editorInstance) {
      import('monaco-vim').then((m) => {
        const initVimMode = m.initVimMode || m.default?.initVimMode;
        vimModeRef.current = initVimMode(editorInstance, statusRef.current!);

        vimModeRef.current.on('vim-mode-change', ({ mode }: { mode: 'insert' | 'normal' }) =>
          setSettings?.((prev: { vimMode: string }) => ({ ...prev, vimMode: mode }))
        );

        update();
      });
    } else {
      vimModeRef.current?.dispose();
    }

    return () => vimModeRef.current?.dispose();
  }, [settings?.vim, editorInstance]);

  useEffect(() => {
    if (vimModeRef.current) {
      vimModeRef.current.dispatch('vim-mode-change', { mode: settings?.vimMode });

      if (settings?.vimMode === 'insert') {
        VimMode.Vim.handleKey(vimModeRef.current, 'i');
      } else {
        VimMode.Vim.exitInsertMode(vimModeRef.current);
      }
    }
  }, [vimModeRef.current, settings?.vimMode]);
};

const useEditorSettings = (keyId: string) => {
  return useLocalStorageState<{
    vimMode: 'insert' | 'normal';
    adjustHeight: boolean;
    memoryHeight: boolean;
    currentHeight: number;
  }>(`code-editor-${keyId}`, {
    defaultValue: { vimMode: 'normal', adjustHeight: true, memoryHeight: true, currentHeight: 300 },
  });
};

const useGlobalEditorSettings = () => {
  return useLocalStorageState<{ vim: boolean }>('code-editor-global', {
    defaultValue: { vim: false },
  });
};

const CodeEditor = (
  {
    ref,
    keyId,
    readOnly,
    maxHeight,
    locale = 'en',

    fullScreenOptions = {
      enableEscExit: true,
      targetContainer: null,
    },

    ...props
  }: {
    keyId: string;
    readOnly?: boolean;
    maxHeight?: number;
    locale: string;
    typeScriptNoValidation?: boolean;
    onUpload?: (callback: (url: string) => void) => void;
    fullScreenOptions?: FullScreenOptions;
  } & BoxProps<typeof Editor>
) => {
  const statusRef = useRef<HTMLElement>(null);
  const dialogState = usePopupState({ variant: 'dialog' });

  const { t } = useLocaleContext(locale);
  const [editor, setEditor] = useState<EditorInstance>();

  const theme = useTheme();
  const handle = useFullScreenHandle();

  const [settings, setSettings] = useEditorSettings(keyId);
  const [globalSettings, setGlobalSettings] = useGlobalEditorSettings();
  const isBreakpointsDownSm = useMediaQuery(theme.breakpoints.down('md'));

  const editorTheme = useMemo(() => {
    // user defined theme
    if (props.theme) {
      return props.theme;
    }

    // auto detect theme by useTheme
    if (theme.palette.mode === 'dark') {
      return 'vs-dark';
    }

    return 'vs';
  }, [theme.palette.mode, props.theme]);

  // Update editor theme when it changes
  useEffect(() => {
    // @ts-ignore
    if (editor) {
      editor.updateOptions({ theme: editorTheme });
    }
  }, [editorTheme]);

  const { registerEmmet } = useEmmet();
  const { registerPrettier } = usePrettier();
  const { registerCloseTag } = useAutoCloseTag();

  useVimMode(editor!, statusRef, { ...globalSettings, ...settings }, setSettings);

  useImperativeHandle(ref, () => ({ insertText }));

  const fullScreenOpts = useMemo(
    () => ({
      enableEscExit: fullScreenOptions?.enableEscExit ?? true,
      targetContainer: fullScreenOptions?.targetContainer ?? null,
    }),
    [fullScreenOptions]
  );

  const currentHeight = useMemo(() => {
    if (handle.active) {
      return Infinity;
    }

    if (settings?.adjustHeight && settings?.memoryHeight) {
      return settings?.currentHeight;
    }

    return 300;
  }, [handle.active, settings?.currentHeight, settings?.adjustHeight, settings?.memoryHeight]);

  // code syntax error
  const [codeSyntaxError, setCodeSyntaxError] = useState(null);
  const debouncedCheckCodeSyntax = useMemo(
    () =>
      debounce((code: string) => {
        try {
          if (props.language === 'yaml') {
            yaml.load(code);
          }
          setCodeSyntaxError(null);
        } catch (error) {
          console.error('code syntax error: ', error);
          setCodeSyntaxError(error.message);
        }
      }, 300),
    [props.language]
  );

  useEffect(() => {
    return () => {
      debouncedCheckCodeSyntax.cancel();
    };
  }, [debouncedCheckCodeSyntax]);

  const onCodeChange = (code: string, e: editor.IModelContentChangedEvent) => {
    props?.onChange?.(code, e);
    debouncedCheckCodeSyntax(code);
  };

  useEffect(() => {
    debouncedCheckCodeSyntax(props.value || '');
  }, [props.value, debouncedCheckCodeSyntax]);

  // add method to insert text
  const insertText = useCallback(
    (text: string) => {
      if (!editor) return;

      const position = editor.getPosition();
      editor.executeEdits('insert', [
        {
          range: {
            startLineNumber: position?.lineNumber || 0,
            startColumn: position?.column || 0,
            endLineNumber: position?.lineNumber || 0,
            endColumn: position?.column || 0,
          },
          text,
        },
      ]);
    },
    [editor]
  );

  const editorRender = () => {
    return (
      <Resizable
        width={Infinity}
        height={currentHeight}
        resizeHandles={handle.active || !settings?.adjustHeight ? [] : ['se']}
        axis="y"
        minConstraints={[Infinity, 300]}
        onResize={(_e, data) => {
          if (settings?.memoryHeight) setSettings((r) => ({ ...r!, currentHeight: data.size.height }));
        }}>
        <Container sx={{ overflow: 'hidden', borderRadius: 1 }}>
          <Box
            sx={{
              flex: 1,
              height: 0,
              p: 1
            }}>
            <Box
              className={cx(props.className, globalSettings?.vim && settings?.vimMode === 'normal' && 'vim-normal')}
              component={Editor}
              {...props}
              onChange={onCodeChange}
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
                autoIndent: true,
                formatOnType: true,
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
              onMount={(editor: EditorInstance, monaco: Monaco) => {
                registerEmmet(editor, monaco);
                registerPrettier(editor, monaco, {
                  theme: editorTheme,
                  typeScriptNoValidation: props.typeScriptNoValidation,
                });
                registerCloseTag(editor, monaco);

                setEditor(editor);
              }}
            />
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
            {codeSyntaxError && (
              <Box sx={{ display: 'flex', gap: 1, zIndex: 1, alignItems: 'center' }}>
                <Tooltip
                  title={
                    <Box
                      sx={{
                        maxHeight: 200,
                        overflow: "auto",
                        whiteSpace: 'pre-wrap'
                      }}>
                      {codeSyntaxError}
                    </Box>
                  }
                  placement="right">
                  <Box component={Icon} icon={XBoxIcon} sx={{ fontSize: 20, color: '#F16E6E' }} />
                </Tooltip>
              </Box>
            )}
            <Box sx={{ flex: 1 }}>
              <Box ref={statusRef} sx={{ fontSize: 10, width: 1, mt: '1px', color: '#999' }} />
            </Box>

            <Box sx={{ display: 'flex', gap: 1, zIndex: 1, alignItems: 'center' }}>
              {props.onUpload && (
                <IconButton
                  size="small"
                  onClick={() =>
                    props.onUpload?.((url) => {
                      insertText(url);
                    })
                  }>
                  <Box component={Icon} icon={CloudUploadIcon} sx={{ color: 'action.active', fontSize: 20 }} />
                </IconButton>
              )}

              {globalSettings?.vim && (
                <Tooltip title={t('vimEnable')}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box component={Icon} icon={LogosVim} sx={{ fontSize: 14, color: '#999' }} />
                  </Box>
                </Tooltip>
              )}

              <IconButton
                size="small"
                onClick={() => editor?.trigger('formatter', 'editor.action.formatDocument', {})}
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

              <IconButton size="small" onClick={() => dialogState.open()}>
                <Box component={Icon} icon={SettingIcon} sx={{ color: 'action.active', fontSize: 20 }} />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Resizable>
    );
  };

  const minWidth = isBreakpointsDownSm ? 300 : theme.breakpoints.values.sm;
  return (
    <>
      <Full handle={handle} options={fullScreenOpts}>
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
                  checked={Boolean(globalSettings?.vim ?? false)}
                  onChange={(_, checked) => {
                    setGlobalSettings((r) => ({ ...r!, vim: checked }));
                  }}
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Settings>
    </>
  );
};

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
  width: 100%;
  height: 100%;

  .react-resizable-handle-se {
    background: transparent;
    z-index: 2;

    &::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
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
    box-sizing: border-box;
  }
`;

function FullScreenContainer({ locale, children }: { locale: string; children: React.ReactNode }) {
  const { t } = useLocaleContext(locale);

  return (
    <Stack
      sx={{
        gap: 1,
        borderRadius: 1,
        bgcolor: '#EFF6FF',
        px: 2,
        py: 1.5,
        width: 1,
        height: 1,
        overflow: 'hidden',
        boxSize: 'border-box'
      }}>
      <Box
        className="between"
        sx={{
          whiteSpace: "nowrap",
          gap: 2
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            minHeight: 32,
            width: 1,
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>{t('editor')}</Box>
        </Box>
      </Box>
      <Stack
        sx={{
          height: 0,
          flex: 1,
          gap: 1,
          borderRadius: 1,
          bgcolor: '#EFF6FF'
        }}>
        <Box
          sx={{
            border: "1px solid #3B82F6",
            borderRadius: 1,
            bgcolor: "background.paper",
            width: 1,
            height: 1,
            zIndex: (theme) => theme.zIndex.tooltip
          }}>
          {children}
        </Box>
      </Stack>
    </Stack>
  );
}

export default CodeEditor;

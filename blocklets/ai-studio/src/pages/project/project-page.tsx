import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  isApiAssistant,
  isAssistant,
  isFunctionAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
import {
  Alert,
  Box,
  Button,
  ButtonProps,
  CircularProgress,
  ClickAwayListener,
  List,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  tabClasses,
  tabsClasses,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { bindMenu, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ApiAssistantEditor from 'src/components/file-editor/api-assistant';
import FunctionAssistantEditor from 'src/components/file-editor/function-file';
import PromptAssistantEditor from 'src/components/file-editor/prompt-file';
import { joinURL, withQuery } from 'ufo';

import WithAwareness from '../../components/awareness/with-awareness';
import { useComponent } from '../../contexts/component';
import { useReadOnly } from '../../contexts/session';
import dirname, { getFileIdFromPath } from '../../utils/path';
import ColumnsLayout, { ImperativeColumnsLayout } from './columns-layout';
import DebugView from './debug-view';
import DiscussView from './discuss-view';
import FileTree, { ImperativeFileTree } from './file-tree';
import Add from './icons/add';
import Code from './icons/code';
import DeveloperTools from './icons/developer-tools';
import Empty from './icons/empty';
import File from './icons/file';
import FolderAdd from './icons/folder-add';
import Import from './icons/import';
import LinkIcon from './icons/link';
import PanelLeft from './icons/panel-left';
import PanelRight from './icons/panel-right';
import { useProjectState } from './state';
import TestView from './test-view';
import { TokenUsage } from './token-usage';
import UndoAndRedo from './undo';
import { PROMPTS_FOLDER_NAME, useProjectStore } from './yjs-state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;
const CURRENT_TAB = (projectId: string) => `ai-studio.currentTab.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { t } = useLocaleContext();

  const { store, synced, getFileById } = useProjectStore(projectId, gitRef, true);

  const fileId = filepath && getFileIdFromPath(filepath);
  const file = fileId && getFileById(fileId);

  const {
    state: { error },
    refetch,
  } = useProjectState(projectId, gitRef);
  if (error) throw error;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const readOnly = useReadOnly({ ref: gitRef });

  const location = useLocation();
  const navigate = useNavigate();

  const [currentTab, setCurrentTab] = useLocalStorageState(CURRENT_TAB(projectId), { defaultValue: 'debug' });

  const [previousFilePath, setPreviousFilePath] = useLocalStorageState<{ [key: string]: string } | undefined>(
    PREVIOUS_FILE_PATH(projectId)
  );

  useEffect(() => {
    if (filepath) return;

    const filepathState = location.state?.filepath;

    const p =
      (typeof filepathState === 'string' ? filepathState : undefined) ||
      (gitRef === defaultBranch ? previousFilePath?.[gitRef] : undefined);

    const filename = p?.split('/').slice(-1)[0];

    const path = filename && Object.values(store.tree).find((i) => i?.endsWith(filename));

    if (path) navigate(joinURL('.', path), { replace: true });
    else {
      const first = Object.values(store.tree).find((i) => i?.startsWith(PROMPTS_FOLDER_NAME) && i.endsWith('.yaml'));
      if (first) navigate(joinURL('.', first), { replace: true });
    }
  }, [gitRef, synced, location]);

  useEffect(() => {
    if (filepath) setPreviousFilePath((v) => ({ ...v, [gitRef]: filepath }));
  }, [gitRef, filepath, setPreviousFilePath]);

  const aiAssistant = useComponent('ai-assistant');

  const onLaunch = useCallback(
    async (assistant: AssistantYjs) => {
      if (!aiAssistant) {
        return;
      }

      window.open(
        withQuery(joinURL(aiAssistant.mountPoint, 'assistants', assistant.id), {
          source: 'studio',
          projectId,
          ref: gitRef,
          working: true,
        }),
        '_blank'
      );
    },
    [aiAssistant, projectId, gitRef]
  );

  const layout = useRef<ImperativeColumnsLayout>(null);
  const fileTree = useRef<ImperativeFileTree>(null);

  const createFileMenuState = usePopupState({ variant: 'popper' });

  return (
    <ColumnsLayout
      ref={layout}
      left={
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
            }}>
            <Toolbar variant="dense" sx={{ px: { xs: 1 }, overflow: 'hidden' }}>
              <PanelToggleButton placement="left" collapsed={false} onClick={() => layout.current?.collapseLeft()} />

              <Box flex={1} />

              <Tooltip title={t('newObject', { object: t('folder') })} disableInteractive>
                <span>
                  <Button
                    disabled={readOnly}
                    sx={{ minWidth: 0 }}
                    onClick={() => {
                      const dir = dirname(filepath);
                      fileTree.current?.newFolder({ parent: dir.length ? dir : [PROMPTS_FOLDER_NAME] });
                    }}>
                    <FolderAdd />
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={t('newObject', { object: t('file') })} disableInteractive>
                <span>
                  <Button disabled={readOnly} sx={{ minWidth: 0 }} {...bindTrigger(createFileMenuState)}>
                    <Add />
                  </Button>
                </span>
              </Tooltip>

              <Popper
                {...bindMenu(createFileMenuState)}
                sx={{ zIndex: (theme) => theme.zIndex.modal }}
                placement="bottom-start">
                <ClickAwayListener onClickAway={createFileMenuState.close}>
                  <Paper elevation={2} onClick={createFileMenuState.close}>
                    <List>
                      <MenuItem
                        onClick={() => {
                          const dir = dirname(filepath);
                          fileTree.current?.newFile({
                            parent: dir[0] === PROMPTS_FOLDER_NAME ? dir : [],
                            rootFolder: PROMPTS_FOLDER_NAME,
                          });
                        }}>
                        <ListItemIcon>
                          <File />
                        </ListItemIcon>
                        <ListItemText primary={t('prompt')} />
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          fileTree.current?.newFile({
                            parent: dirname(filepath),
                            meta: { type: 'api' },
                            rootFolder: PROMPTS_FOLDER_NAME,
                          })
                        }>
                        <ListItemIcon>
                          <LinkIcon />
                        </ListItemIcon>
                        <ListItemText primary={t('api')} />
                      </MenuItem>
                      <MenuItem
                        onClick={() =>
                          fileTree.current?.newFile({
                            parent: dirname(filepath),
                            meta: { type: 'function' },
                            rootFolder: PROMPTS_FOLDER_NAME,
                          })
                        }>
                        <ListItemIcon>
                          <Code />
                        </ListItemIcon>
                        <ListItemText primary={t('function')} />
                      </MenuItem>
                    </List>
                  </Paper>
                </ClickAwayListener>
              </Popper>

              <Tooltip title={t('import.title')} disableInteractive>
                <span>
                  <Button disabled={readOnly} sx={{ minWidth: 0 }} onClick={() => fileTree.current?.importFrom()}>
                    <Import />
                  </Button>
                </span>
              </Tooltip>
            </Toolbar>
          </Box>

          <FileTree
            ref={fileTree}
            projectId={projectId}
            gitRef={gitRef}
            mutable={!readOnly}
            current={filepath}
            onLaunch={aiAssistant ? onLaunch : undefined}
            sx={{ flexGrow: 1 }}
          />
        </Stack>
      }
      right={
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
            }}>
            <Toolbar variant="dense" sx={{ gap: 1, px: { xs: 1 } }}>
              <Tabs
                variant="scrollable"
                scrollButtons={false}
                value={currentTab}
                onChange={(_, tab) => setCurrentTab(tab)}
                TabIndicatorProps={{ children: <Box component="span" /> }}
                sx={{
                  ml: 1,
                  minHeight: 32,
                  [`.${tabClasses.root}`]: {
                    py: 1,
                    px: 1,
                    minHeight: 32,
                    minWidth: 32,
                    borderRadius: 1,
                  },
                  [`.${tabsClasses.indicator}`]: {
                    bgcolor: 'transparent',

                    span: {
                      display: 'block',
                      mx: 1,
                      bgcolor: 'primary.main',
                      height: '100%',
                    },
                  },
                }}>
                <Tab value="debug" label={t('debug')} />
                <Tab value="test" label={t('test')} />
                <Tab value="discuss" label={t('discuss')} />
              </Tabs>

              <Box flex={1} />

              <PanelToggleButton placement="right" collapsed={false} onClick={() => layout.current?.collapseRight()} />
            </Toolbar>
          </Box>

          {!file ? (
            <DebugEmptyView />
          ) : currentTab === 'debug' ? (
            <DebugView projectId={projectId} gitRef={gitRef} assistant={file} setCurrentTab={setCurrentTab} />
          ) : currentTab === 'test' ? (
            <TestView projectId={projectId} gitRef={gitRef} assistant={file} setCurrentTab={setCurrentTab} />
          ) : currentTab === 'discuss' ? (
            <DiscussView projectId={projectId} gitRef={gitRef} assistant={file} />
          ) : null}
        </Stack>
      }>
      {({ leftOpen, rightOpen }) => (
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
            }}>
            <Toolbar variant="dense" sx={{ px: { xs: 1 } }}>
              {!leftOpen && (
                <PanelToggleButton
                  placement="left"
                  collapsed
                  onClick={() => (leftOpen ? layout.current?.collapseLeft() : layout.current?.expandLeft())}
                />
              )}

              <Box flex={1} />

              {file && <UndoAndRedo projectId={projectId} gitRef={gitRef} id={fileId} />}

              {!rightOpen && (
                <PanelToggleButton
                  placement="right"
                  collapsed
                  onClick={() => (rightOpen ? layout.current?.collapseRight() : layout.current?.expandRight())}
                />
              )}
            </Toolbar>
          </Box>

          <Box mx={{ xs: 2 }} flexGrow={1}>
            {!synced ? (
              <Box sx={{ textAlign: 'center', mt: 10 }}>
                <CircularProgress size={32} />
              </Box>
            ) : file ? (
              <WithAwareness projectId={projectId} gitRef={gitRef} path={[file.id]} onMount>
                {isPromptAssistant(file) ? (
                  <PromptAssistantEditor projectId={projectId} gitRef={gitRef} value={file} />
                ) : isApiAssistant(file) ? (
                  <ApiAssistantEditor projectId={projectId} gitRef={gitRef} value={file} />
                ) : isFunctionAssistant(file) ? (
                  <FunctionAssistantEditor projectId={projectId} gitRef={gitRef} value={file} />
                ) : (
                  <Box />
                )}
              </WithAwareness>
            ) : filepath ? (
              <Alert color="error">Not Found</Alert>
            ) : (
              <EmptyView />
            )}
          </Box>

          {file && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                bgcolor: 'background.paper',
                zIndex: (theme) => theme.zIndex.appBar,
                borderTop: (theme) => `1px solid ${theme.palette.grey[50]}`,
              }}>
              {isAssistant(file) && (
                <Toolbar variant="dense" sx={{ px: { xs: 1 } }}>
                  <TokenUsage assistant={file} />
                  <Box />
                </Toolbar>
              )}
            </Box>
          )}
        </Stack>
      )}
    </ColumnsLayout>
  );
}

function PanelToggleButton({
  placement,
  collapsed,
  ...props
}: ButtonProps & { placement: 'left' | 'right'; collapsed?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <Tooltip title={collapsed ? t('showSidebar') : t('hideSidebar')}>
      <Button {...props} sx={{ minWidth: 0, flexShrink: 0, ...props.sx }}>
        {placement === 'left' ? <PanelLeft /> : <PanelRight />}
      </Button>
    </Tooltip>
  );
}

function EmptyView() {
  const { t } = useLocaleContext();

  return (
    <Stack color="text.disabled" alignItems="center" my={8} gap={3}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography>{t('notOpenFile')}</Typography>
    </Stack>
  );
}

function DebugEmptyView() {
  const { t } = useLocaleContext();

  return (
    <Stack color="text.disabled" alignItems="center" my={8} gap={3}>
      <DeveloperTools sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography>{t('notOpenFile')}</Typography>
    </Stack>
  );
}

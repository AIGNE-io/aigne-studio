import AgentEditor from '@app/components/file-editor/agent-editor';
import { CurrentProjectProvider } from '@app/contexts/project';
import currentGitStore, { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import FolderPlusIcon from '@iconify-icons/tabler/folder-plus';
import SidebarLeft from '@iconify-icons/tabler/layout-sidebar';
import SidebarRight from '@iconify-icons/tabler/layout-sidebar-right';
import PlayerPlayIcon from '@iconify-icons/tabler/player-play';
import PlusIcon from '@iconify-icons/tabler/plus';
import TableImportIcon from '@iconify-icons/tabler/table-import';
import {
  Alert,
  Box,
  Button,
  ButtonProps,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Tooltip,
  Typography,
  tabClasses,
  tabsClasses,
} from '@mui/material';
import { useLocalStorageState, useTitle } from 'ahooks';
import { Suspense, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Balancer from 'react-wrap-balancer';
import { joinURL, withQuery } from 'ufo';

import WithAwareness from '../../components/awareness/with-awareness';
import { useComponent } from '../../contexts/component';
import { useReadOnly } from '../../contexts/session';
import dirname, { getFileIdFromPath } from '../../utils/path';
import ColumnsLayout, { ImperativeColumnsLayout } from './columns-layout';
import DebugView from './debug-view';
import DiscussView from './discuss-view';
import FileTree, { ImperativeFileTree } from './file-tree';
import DeveloperTools from './icons/developer-tools';
import Empty from './icons/empty';
import PreviewView from './preview-view';
import { useProjectState } from './state';
import { newDefaultPrompt } from './template';
import TestView from './test-view';
import { PROMPTS_FOLDER_NAME, useProjectStore } from './yjs-state';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;
const CURRENT_TAB = (projectId: string) => `ai-studio.currentTab.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref: gitRef } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  return (
    <CurrentProjectProvider projectId={projectId} projectRef={gitRef}>
      <ProjectPageView />
    </CurrentProjectProvider>
  );
}

function ProjectPageView() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  currentGitStore.setState({
    currentProjectId: projectId,
  });
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { t } = useLocaleContext();

  const { store, synced, getFileById } = useProjectStore(projectId, gitRef, true);

  const fileId = filepath && getFileIdFromPath(filepath);
  const file = fileId && getFileById(fileId);

  const {
    state: { error, project },
    refetch,
  } = useProjectState(projectId, gitRef);
  if (error) throw error;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const readOnly = useReadOnly({ ref: gitRef });

  const location = useLocation();
  const navigate = useNavigate();
  useTitle(project?.name || 'AI Studio');

  const [currentTab, setCurrentTab] = useLocalStorageState(CURRENT_TAB(projectId), { defaultValue: 'preview' });

  const [previousFilePath, setPreviousFilePath] = useLocalStorageState<{ [key: string]: string } | undefined>(
    PREVIOUS_FILE_PATH(projectId)
  );

  useEffect(() => {
    if (filepath) return;

    const filepathState = location.state?.filepath;

    const p =
      (typeof filepathState === 'string' ? filepathState : undefined) ||
      (gitRef === getDefaultBranch() ? previousFilePath?.[gitRef] : undefined);

    const filename = p?.split('/').slice(-1)[0];

    const path =
      filename && Object.values(store.tree).find((i) => i?.startsWith(PROMPTS_FOLDER_NAME) && i?.endsWith(filename));

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

  return (
    <ColumnsLayout
      ref={layout}
      left={
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}>
            <Toolbar variant="dense" sx={{ px: { xs: 2, gap: 1.5 }, overflow: 'hidden', minHeight: 36 }}>
              <PanelToggleButton placement="left" collapsed={false} onClick={() => layout.current?.collapseLeft()} />

              <Box
                sx={{
                  flex: 1,
                }}
              />

              {project?.homePageUrl && (
                <Button
                  data-testid="home-page-button"
                  sx={{ minWidth: 0 }}
                  color="secondary"
                  onClick={() => window.open(project.homePageUrl)}>
                  <Box
                    component={Icon}
                    icon={PlayerPlayIcon}
                    sx={{
                      fontSize: 20,
                      color: 'info.main',
                    }}
                  />
                </Button>
              )}

              <Tooltip title={t('importObject', { object: t('agents') })} disableInteractive>
                <span>
                  <Button
                    data-testid="import-agent-button"
                    disabled={readOnly}
                    sx={{ minWidth: 0 }}
                    onClick={() => fileTree.current?.importFrom()}>
                    <Box
                      component={Icon}
                      icon={TableImportIcon}
                      sx={{
                        fontSize: 20,
                        color: 'primary.main',
                      }}
                    />
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={t('newObject', { object: t('group') })} disableInteractive>
                <span>
                  <Button
                    data-testid="new-group-button"
                    disabled={readOnly}
                    sx={{ minWidth: 0 }}
                    onClick={() => {
                      const dir = dirname(filepath);
                      fileTree.current?.newFolder({ parent: dir.length ? dir : [PROMPTS_FOLDER_NAME] });
                    }}>
                    <Box
                      component={Icon}
                      icon={FolderPlusIcon}
                      sx={{
                        fontSize: 20,
                        color: 'primary.main',
                      }}
                    />
                  </Button>
                </span>
              </Tooltip>

              <Tooltip title={t('newObject', { object: t('agent') })} disableInteractive>
                <span>
                  <Button
                    data-testid="new-agent-button"
                    disabled={readOnly}
                    sx={{ minWidth: 0 }}
                    onClick={() => {
                      const dir = dirname(filepath);
                      fileTree.current?.newFile({
                        parent: dir[0] === PROMPTS_FOLDER_NAME ? dir : [],
                        rootFolder: PROMPTS_FOLDER_NAME,
                        meta: newDefaultPrompt(),
                      });
                    }}>
                    <Box
                      component={Icon}
                      icon={PlusIcon}
                      sx={{
                        fontSize: 20,
                        color: 'primary.main',
                      }}
                    />
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
        <Stack sx={{ display: 'flex', height: '100%' }}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              zIndex: 10,
            }}>
            <Box
              className="between"
              sx={{
                px: 2.5,
                '.MuiTab-root': {
                  py: 1.5,
                  lineHeight: '24px',
                  fontWeight: 500,
                  fontSize: 14,

                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },

                '.MuiTabs-indicator': {
                  span: {
                    background: (theme) => `${theme.palette.primary.main} !important`,
                  },
                },
              }}>
              <Tabs
                variant="scrollable"
                scrollButtons={false}
                value={currentTab}
                onChange={(_, tab) => {
                  setCurrentTab(tab);
                }}
                sx={{
                  ml: -1,
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
                }}
                slotProps={{
                  indicator: { children: <Box component="span" /> },
                }}>
                <Tab value="preview" label={t('preview')} data-testid="debug-preview-view" />
                <Tab value="debug" label={t('debug')} data-testid="debug-view-debug" />
                <Tab value="test" label={t('test')} data-testid="debug-view-tests" />
                <Tab value="discuss" label={t('discuss')} data-testid="debug-view-collaboration" />
              </Tabs>

              <Box
                sx={{
                  flex: 1,
                }}
              />

              <PanelToggleButton placement="right" collapsed={false} onClick={() => layout.current?.collapseRight()} />
            </Box>
          </Box>

          <Suspense>
            {!file ? (
              <DebugEmptyView />
            ) : currentTab === 'preview' ? (
              <PreviewView projectId={projectId} gitRef={gitRef} assistant={file} />
            ) : currentTab === 'debug' ? (
              <DebugView projectId={projectId} gitRef={gitRef} assistant={file} setCurrentTab={setCurrentTab} />
            ) : currentTab === 'test' ? (
              <TestView projectId={projectId} gitRef={gitRef} assistant={file} setCurrentTab={setCurrentTab} />
            ) : currentTab === 'discuss' ? (
              <DiscussView projectId={projectId} gitRef={gitRef} assistant={file} />
            ) : null}
          </Suspense>
        </Stack>
      }>
      {({ leftOpen, rightOpen }) => (
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 10,
            }}>
            {(!leftOpen || !rightOpen) && (
              <Toolbar variant="dense" sx={{ px: { xs: 1 } }}>
                {!leftOpen && (
                  <PanelToggleButton
                    placement="left"
                    collapsed
                    onClick={() => (leftOpen ? layout.current?.collapseLeft() : layout.current?.expandLeft())}
                  />
                )}

                <Box
                  sx={{
                    flex: 1,
                  }}
                />

                {!rightOpen && (
                  <PanelToggleButton
                    placement="right"
                    collapsed
                    onClick={() => (rightOpen ? layout.current?.collapseRight() : layout.current?.expandRight())}
                  />
                )}
              </Toolbar>
            )}
          </Box>

          <Box
            sx={{
              flexGrow: 1,
            }}>
            {!synced ? (
              <Box sx={{ textAlign: 'center', mt: 10 }}>
                <CircularProgress size={32} />
              </Box>
            ) : file ? (
              <WithAwareness indicator={false} projectId={projectId} gitRef={gitRef} path={[file.id]} onMount>
                <AgentEditor projectId={projectId} gitRef={gitRef} value={file} />
              </WithAwareness>
            ) : filepath ? (
              <Alert color="error">Not Found</Alert>
            ) : (
              <EmptyView />
            )}
          </Box>
        </Stack>
      )}
    </ColumnsLayout>
  );
}

function PanelToggleButton({
  placement,
  collapsed = undefined,
  ...props
}: ButtonProps & { placement: 'left' | 'right'; collapsed?: boolean }) {
  const { t } = useLocaleContext();

  return (
    <Tooltip title={collapsed ? t('showSidebar') : t('hideSidebar')}>
      <Button {...props} sx={{ minWidth: 0, flexShrink: 0, ...props.sx }}>
        <Box
          component={Icon}
          icon={placement === 'left' ? SidebarLeft : SidebarRight}
          sx={{
            fontSize: 20,
            color: 'primary.main',
          }}
        />
      </Button>
    </Tooltip>
  );
}

function EmptyView() {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        color: 'text.disabled',
        alignItems: 'center',
        my: 13,
        gap: 3,
      }}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography
        sx={{
          px: 2,
          width: '100%',
          textAlign: 'center',
        }}>
        <Balancer>{t('notOpenFile')}</Balancer>
      </Typography>
    </Stack>
  );
}

function DebugEmptyView() {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        color: 'text.disabled',
        alignItems: 'center',
        my: 8,
        gap: 3,
      }}>
      <DeveloperTools sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography
        sx={{
          width: '100%',
          px: 2,
          textAlign: 'center',
        }}>
        <Balancer>{t('notOpenFile')}</Balancer>
      </Typography>
    </Stack>
  );
}

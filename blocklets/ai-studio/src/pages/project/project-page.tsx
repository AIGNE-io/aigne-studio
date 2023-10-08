import { Conversation, ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import { cx } from '@emotion/css';
import {
  AddRounded,
  CreateNewFolderOutlined,
  DragIndicator,
  HighlightOff,
  KeyboardDoubleArrowLeftRounded,
  KeyboardDoubleArrowRightRounded,
  MenuOpenRounded,
  Start,
  TuneRounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  BoxProps,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  buttonClasses,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { ReactNode, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Template } from '../../../api/src/store/templates';
import WithAwareness from '../../components/awareness/with-awareness';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView from '../../components/template-form';
import Popper from '../../components/template-form/popper';
import TemplateSettings from '../../components/template-form/template-settings';
import { useComponent } from '../../contexts/component';
import { useIsAdmin } from '../../contexts/session';
import { callAI, imageGenerations, textCompletions } from '../../libs/ai';
import FileTree, { ImperativeFileTree } from './file-tree';
import { useProjectState } from './state';
import { isTemplate, useStore } from './yjs-state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { store, synced } = useStore(projectId, gitRef, true);

  const id = Object.entries(store.tree).find((i) => i[1] === filepath)?.[0];
  const file = id ? store.files[id] : undefined;
  const template = isTemplate(file) ? file : undefined;

  const { refetch } = useProjectState(projectId, gitRef);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const isAdmin = useIsAdmin();
  const disableMutation = gitRef === defaultBranch && !isAdmin;

  const location = useLocation();
  const navigate = useNavigate();

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

    if (path) navigate(path, { replace: true });
  }, [gitRef, synced, location]);

  useEffect(() => {
    if (filepath) setPreviousFilePath((v) => ({ ...v, [gitRef]: filepath }));
  }, [gitRef, filepath, setPreviousFilePath]);

  const conversation = useRef<ConversationRef>(null);

  const { messages, add, cancel } = useConversation({
    scrollToBottom: (o) => conversation.current?.scrollToBottom(o),
    textCompletions: async (prompt, { meta }: { meta?: { template: Template; path: string } } = {}) => {
      if (!meta) {
        return textCompletions({
          ...(typeof prompt === 'string' ? { prompt } : { messages: prompt }),
          stream: true,
        });
      }
      return callAI({
        projectId,
        template: meta.template,
        parameters: Object.fromEntries(
          Object.entries(meta.template.parameters ?? {}).map(([key, val]) => [key, parameterToStringValue(val)])
        ),
      });
    },
    imageGenerations: (prompt) =>
      imageGenerations({ ...prompt, size: prompt.size as ImageGenerationSize, response_format: 'b64_json' }).then(
        (res) => res.data.map((i) => ({ url: `data:image/png;base64,${i.b64_json}` }))
      ),
  });

  const customActions = useCallback(
    (msg: Omit<MessageItem, 'meta'> & { meta?: { template: Template; path: string } }): [ReactNode[], ReactNode[]] => {
      const { meta } = msg;

      return [
        [],
        [
          meta?.template.id && (
            <Tooltip key="template" title="Use current template" placement="top">
              <Button size="small" onClick={() => navigate(joinUrl('.', meta.path))}>
                <Start fontSize="small" />
              </Button>
            </Tooltip>
          ),
          msg.loading && (
            <Tooltip key="stop" title="Stop" placement="top">
              <Button size="small" onClick={() => cancel(msg)}>
                <HighlightOff fontSize="small" />
              </Button>
            </Tooltip>
          ),
        ],
      ];
    },
    [cancel, navigate]
  );

  // const onExecute = async (template: TemplateYjs) => {
  //   const { parameters } = template;
  //   const question = parameters?.question?.value;

  //   add(question?.toString() || '', { template: templateYjsToTemplate(template), path: filepath });
  // };

  const assistant = useComponent('ai-assistant');

  const onLaunch = useCallback(
    async (template: TemplateYjs) => {
      if (!assistant) {
        return;
      }

      const mode = `${template.mode === 'chat' ? 'chat' : 'templates'}`;

      window.open(
        `${assistant.mountPoint}/projects/${projectId}/${gitRef}/${mode}/${template.id}?source=studio`,
        '_blank'
      );
    },
    [assistant, projectId, gitRef]
  );

  const layout = useRef<ImperativeLayout>(null);
  const fileTree = useRef<ImperativeFileTree>(null);

  const settings = usePopupState({ variant: 'popper' });

  return (
    <Layout
      ref={layout}
      left={
        <Stack sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense">
              <Button
                startIcon={<MenuOpenRounded />}
                onClick={() => layout.current?.collapseLeft()}
                sx={{ [`.${buttonClasses.startIcon}`]: { ml: 0 }, flexShrink: 0 }}>
                Files
              </Button>

              <Box flex={1} />

              <IconButton disabled={disableMutation} color="primary" onClick={() => fileTree.current?.newFolder()}>
                <CreateNewFolderOutlined fontSize="small" />
              </IconButton>

              <IconButton disabled={disableMutation} color="primary" onClick={() => fileTree.current?.newFile()}>
                <AddRounded fontSize="small" />
              </IconButton>
            </Toolbar>
          </Box>

          <FileTree
            ref={fileTree}
            projectId={projectId}
            gitRef={gitRef}
            mutable={!disableMutation}
            current={filepath}
            onLaunch={assistant ? onLaunch : undefined}
            sx={{ flexGrow: 1 }}
          />
        </Stack>
      }
      right={
        <Stack sx={{ height: '100%' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense">
              <Button
                startIcon={<MenuOpenRounded sx={{ transform: 'rotate(180deg)' }} />}
                onClick={() => layout.current?.collapseRight()}>
                Tools
              </Button>
            </Toolbar>
          </Box>

          <Conversation
            ref={conversation}
            messages={messages}
            sx={{ flex: 1, overflow: 'auto' }}
            onSubmit={(prompt) => add(prompt)}
            customActions={customActions}
          />
        </Stack>
      }>
      {({ leftOpen, rightOpen }) => (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: (theme) => theme.zIndex.appBar,
              borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
            }}>
            <Toolbar variant="dense">
              {!leftOpen && (
                <Button
                  startIcon={<MenuOpenRounded sx={{ transform: 'rotate(-180deg)' }} />}
                  onClick={() => (leftOpen ? layout.current?.collapseLeft() : layout.current?.expandLeft())}
                  sx={{ [`.${buttonClasses.startIcon}`]: { ml: 0 } }}>
                  Files
                </Button>
              )}

              <Box flex={1} />

              <IconButton
                {...bindTrigger(settings)}
                sx={{ bgcolor: settings.isOpen ? (theme) => theme.palette.action.selected : undefined }}>
                <TuneRounded />
              </IconButton>

              {template && (
                <Popper {...bindPopper(settings)} onClose={settings.close}>
                  <Paper elevation={3} sx={{ mt: -1, p: 4, maxWidth: 'sm', borderRadius: 3 }}>
                    <TemplateSettings projectId={projectId} gitRef={gitRef} value={template} />
                  </Paper>
                </Popper>
              )}

              {!rightOpen && (
                <Button
                  startIcon={<MenuOpenRounded />}
                  onClick={() => (rightOpen ? layout.current?.collapseRight() : layout.current?.expandRight())}>
                  Tools
                </Button>
              )}
            </Toolbar>
          </Box>

          <Box mx={{ xs: 3, sm: 4 }} my={{ xs: 1, sm: 2 }}>
            {filepath && <TemplateEditor projectId={projectId} gitRef={gitRef} path={filepath} />}
          </Box>
        </Box>
      )}
    </Layout>
  );
}

interface ImperativeLayout {
  collapseLeft: () => void;
  expandLeft: () => void;
  collapseRight: () => void;
  expandRight: () => void;
}

const Layout = forwardRef<
  ImperativeLayout,
  {
    left?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
    right?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
    children?: ReactNode | ((props: { isLargeScreen: boolean; leftOpen: boolean; rightOpen: boolean }) => ReactNode);
    onLeftCollapse?: (collapsed: boolean) => void;
    onRightCollapse?: (collapsed: boolean) => void;
  }
>(({ onLeftCollapse, onRightCollapse, ...props }, ref) => {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const leftPanel = useRef<ImperativePanelHandle>();
  const rightPanel = useRef<ImperativePanelHandle>();

  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    if (isLargeScreen) {
      if (leftDrawerOpen) setTimeout(() => leftPanel.current?.expand());
      if (rightDrawerOpen) setTimeout(() => rightPanel.current?.expand());

      setLeftDrawerOpen(false);
      setRightDrawerOpen(false);
    }
  }, [isLargeScreen]);

  useImperativeHandle(
    ref,
    () => ({
      collapseLeft: () => (isLargeScreen ? leftPanel.current?.collapse() : setLeftDrawerOpen(false)),
      expandLeft: () => (isLargeScreen ? leftPanel.current?.expand() : setLeftDrawerOpen(true)),
      collapseRight: () => (isLargeScreen ? rightPanel.current?.collapse() : setRightDrawerOpen(false)),
      expandRight: () => (isLargeScreen ? rightPanel.current?.expand() : setRightDrawerOpen(true)),
    }),
    [isLargeScreen]
  );

  const leftOpen = isLargeScreen ? !leftPanelCollapsed : leftDrawerOpen;
  const rightOpen = isLargeScreen ? !rightPanelCollapsed : rightDrawerOpen;

  const left = typeof props.left === 'function' ? props.left({ isLargeScreen, leftOpen, rightOpen }) : props.left;
  const right = typeof props.right === 'function' ? props.right({ isLargeScreen, leftOpen, rightOpen }) : props.right;
  const children =
    typeof props.children === 'function' ? props.children({ isLargeScreen, leftOpen, rightOpen }) : props.children;

  if (!isLargeScreen) {
    return (
      <Box height="100%" overflow="auto">
        {children}

        <Drawer
          open={leftDrawerOpen}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
          PaperProps={{ sx: { width: 300, pt: 8 } }}
          onClose={() => setLeftDrawerOpen(false)}>
          {left}
        </Drawer>

        <Drawer
          anchor="right"
          open={rightDrawerOpen}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
          PaperProps={{ sx: { width: 'calc(100% - 16px)', pt: 8 } }}
          onClose={() => setRightDrawerOpen(false)}>
          {right}
        </Drawer>
      </Box>
    );
  }

  return (
    <Box height="100%">
      <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal">
        <Box
          component={Panel}
          ref={leftPanel}
          defaultSize={10}
          minSize={10}
          collapsible
          onCollapse={(collapsed) => {
            onLeftCollapse?.(collapsed);
            setLeftPanelCollapsed(collapsed);
          }}>
          {left}
        </Box>

        <ResizeHandle
          collapsed={leftPanelCollapsed}
          icon={leftPanelCollapsed ? <KeyboardDoubleArrowRightRounded /> : undefined}
          onClick={() => leftPanelCollapsed && leftPanel.current?.expand()}
        />

        <Box component={Panel} minSize={30}>
          {children}
        </Box>

        <ResizeHandle
          collapsed={rightPanelCollapsed}
          icon={rightPanelCollapsed ? <KeyboardDoubleArrowLeftRounded /> : undefined}
          onClick={() => rightPanelCollapsed && rightPanel.current?.expand()}
        />

        <Box
          component={Panel}
          ref={rightPanel}
          defaultSize={45}
          minSize={20}
          collapsible
          onCollapse={(collapsed) => {
            onRightCollapse?.(collapsed);
            setRightPanelCollapsed(collapsed);
          }}>
          {right}
        </Box>
      </Box>
    </Box>
  );
});

function TemplateEditor({ projectId, gitRef, path }: { projectId: string; gitRef: string; path: string }) {
  const { store, synced } = useStore(projectId, gitRef);
  if (!synced)
    return (
      <Box sx={{ textAlign: 'center', mt: 10 }}>
        <CircularProgress size={32} />
      </Box>
    );

  const id = Object.entries(store.tree).find((i) => i[1] === path)?.[0];
  const template = id ? store.files[id] : undefined;
  if (!template || !isTemplate(template)) return <Alert color="error">Not Found</Alert>;

  return (
    <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id]} onMount>
      <TemplateFormView projectId={projectId} gitRef={gitRef} value={template} />
    </WithAwareness>
  );
}

function ResizeHandle({ icon, collapsed, ...props }: { collapsed?: boolean; icon?: ReactNode } & BoxProps) {
  return (
    <ResizeHandleRoot component={PanelResizeHandle} className={cx(collapsed && 'collapsed')}>
      <Box {...props} className="handler">
        {icon || <DragIndicator />}
      </Box>
    </ResizeHandleRoot>
  );
}

const ResizeHandleRoot = styled(Box)`
  width: 0;
  height: 100%;
  position: relative;
  z-index: 10;
  overflow: visible;
  border-right: ${({ theme }) => `1px dashed ${theme.palette.grey[200]}`};

  &.collapsed {
    border-color: transparent;
  }

  .handler {
    position: absolute;
    left: -5px;
    top: 0;
    bottom: 0;
    width: 10px;
    height: 100px;
    border-radius: 5px;
    margin: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }) => theme.palette.grey[100]};
    transition: ${({ theme }) =>
      theme.transitions.create('all', {
        easing: theme.transitions.easing.sharp,
      })};

    svg {
      font-size: 14px;
    }
  }

  :hover,
  &[data-resize-handle-active] {
    .handler {
      left: -5px;
      height: calc(100% - 128px);
      width: 10px;
      background-color: ${({ theme }) => theme.palette.grey[100]};
      border-radius: 5px;
    }
  }
`;

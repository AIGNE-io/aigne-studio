import { Conversation, ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import { cx } from '@emotion/css';
import {
  DragIndicator,
  HighlightOff,
  KeyboardDoubleArrowLeftRounded,
  KeyboardDoubleArrowRightRounded,
  MenuOpenRounded,
  Start,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  BoxProps,
  Button,
  CircularProgress,
  Drawer,
  Stack,
  Toolbar,
  Tooltip,
  styled,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ImperativePanelHandle, Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Template } from '../../../api/src/store/templates';
import WithAwareness from '../../components/awareness/with-awareness';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView from '../../components/template-form';
import { useComponent } from '../../contexts/component';
import { useIsAdmin } from '../../contexts/session';
import { callAI, imageGenerations, textCompletions } from '../../libs/ai';
import FileTree from './file-tree';
import { useProjectState } from './state';
import { isTemplate, templateYjsToTemplate, useStore } from './yjs-state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { store, synced } = useStore(projectId, gitRef, true);

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

  const onExecute = async (template: TemplateYjs) => {
    const { parameters } = template;
    const question = parameters?.question?.value;

    add(question?.toString() || '', { template: templateYjsToTemplate(template), path: filepath });
  };

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

  const [fileTreeCollapsed, setFileTreeCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const fileTreePanel = useRef<ImperativePanelHandle>();
  const rightPanel = useRef<ImperativePanelHandle>();

  const theme = useTheme();
  const isUpMd = useMediaQuery(theme.breakpoints.up('md'));

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  if (!isUpMd) {
    return (
      <Box height="100%" overflow="auto">
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
              startIcon={<MenuOpenRounded sx={{ transform: 'rotate(-180deg)' }} />}
              onClick={() => setLeftOpen(!leftOpen)}>
              Files
            </Button>
            <Box flex={1} />
            <Button startIcon={<MenuOpenRounded />} onClick={() => setRightOpen(!rightOpen)}>
              Tools
            </Button>
          </Toolbar>
        </Box>

        <Drawer
          open={leftOpen}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
          PaperProps={{ sx: { width: 300, pt: 8 } }}
          onClose={() => setLeftOpen(false)}>
          <Toolbar variant="dense">
            <Box flex={1} />

            <Button startIcon={<MenuOpenRounded />} onClick={() => setLeftOpen(!leftOpen)}>
              Files
            </Button>
          </Toolbar>

          <FileTree
            projectId={projectId}
            gitRef={gitRef}
            mutable={!disableMutation}
            current={filepath}
            onLaunch={assistant ? onLaunch : undefined}
          />
        </Drawer>

        <Box mx={{ xs: 3, sm: 4 }} my={{ xs: 1, sm: 2 }}>
          {filepath && <TemplateEditor projectId={projectId} gitRef={gitRef} path={filepath} onExecute={onExecute} />}
        </Box>

        <Drawer
          anchor="right"
          open={rightOpen}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
          PaperProps={{ sx: { width: 'calc(100% - 16px)', pt: 8 } }}
          onClose={() => setRightOpen(false)}>
          <Toolbar variant="dense">
            <Button
              startIcon={<MenuOpenRounded sx={{ transform: 'rotate(-180deg)' }} />}
              onClick={() => setRightOpen(!rightOpen)}>
              Tools
            </Button>
          </Toolbar>

          <Conversation
            ref={conversation}
            messages={messages}
            sx={{ flex: 1, overflow: 'auto' }}
            onSubmit={(prompt) => add(prompt)}
            customActions={customActions}
          />
        </Drawer>
      </Box>
    );
  }

  return (
    <Box height="100%">
      <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal">
        <Box
          component={Panel}
          ref={fileTreePanel}
          defaultSize={10}
          minSize={10}
          collapsible
          onCollapse={setFileTreeCollapsed}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: 'background.paper',
                zIndex: (theme) => theme.zIndex.appBar,
                borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
              }}>
              <PanelToolbar>
                <Box flex={1} />

                <Button
                  startIcon={<MenuOpenRounded />}
                  onClick={() =>
                    fileTreeCollapsed ? fileTreePanel.current?.expand() : fileTreePanel.current?.collapse()
                  }>
                  Files
                </Button>
              </PanelToolbar>
            </Box>

            <FileTree
              projectId={projectId}
              gitRef={gitRef}
              mutable={!disableMutation}
              current={filepath}
              onLaunch={assistant ? onLaunch : undefined}
            />
          </Box>
        </Box>

        <ResizeHandle
          collapsed={fileTreeCollapsed}
          icon={fileTreeCollapsed ? <KeyboardDoubleArrowRightRounded /> : undefined}
          onClick={() => fileTreeCollapsed && fileTreePanel.current?.expand()}
        />

        <Box component={Panel} minSize={30}>
          <Box sx={{ height: '100%', overflow: 'auto' }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: 'background.paper',
                zIndex: (theme) => theme.zIndex.appBar,
                borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
              }}>
              <PanelToolbar>
                {fileTreeCollapsed && (
                  <Button
                    startIcon={<MenuOpenRounded sx={{ transform: 'rotate(-180deg)' }} />}
                    onClick={() =>
                      fileTreeCollapsed ? fileTreePanel.current?.expand() : fileTreePanel.current?.collapse()
                    }>
                    Files
                  </Button>
                )}
                <Box flex={1} />

                {rightCollapsed && (
                  <Button
                    startIcon={<MenuOpenRounded />}
                    onClick={() => (rightCollapsed ? rightPanel.current?.expand() : rightPanel.current?.collapse())}>
                    Tools
                  </Button>
                )}
              </PanelToolbar>
            </Box>

            <Box p={2}>
              {filepath && (
                <TemplateEditor projectId={projectId} gitRef={gitRef} path={filepath} onExecute={onExecute} />
              )}
            </Box>
          </Box>
        </Box>

        <ResizeHandle
          collapsed={rightCollapsed}
          icon={rightCollapsed ? <KeyboardDoubleArrowLeftRounded /> : undefined}
          onClick={() => rightCollapsed && rightPanel.current?.expand()}
        />

        <Box
          component={Panel}
          ref={rightPanel}
          defaultSize={45}
          minSize={20}
          collapsible
          onCollapse={setRightCollapsed}>
          <Stack sx={{ height: '100%' }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: 'background.paper',
                zIndex: (theme) => theme.zIndex.appBar,
                borderBottom: (theme) => `1px dashed ${theme.palette.grey[200]}`,
              }}>
              <PanelToolbar>
                <Button
                  startIcon={<MenuOpenRounded sx={{ transform: 'rotate(180deg)' }} />}
                  onClick={() => (rightCollapsed ? rightPanel.current?.expand() : rightPanel.current?.collapse())}>
                  Tools
                </Button>
              </PanelToolbar>
            </Box>

            <Conversation
              ref={conversation}
              messages={messages}
              sx={{ flex: 1, overflow: 'auto' }}
              onSubmit={(prompt) => add(prompt)}
              customActions={customActions}
            />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

const PanelToolbar = styled(Stack)`
  padding-left: 8px;
  padding-right: 8px;
  min-height: 48px;
  flex-direction: row;
  align-items: center;
`;

function TemplateEditor({
  projectId,
  gitRef,
  path,
  onExecute,
}: {
  projectId: string;
  gitRef: string;
  path: string;
  onExecute: (template: TemplateYjs) => any;
}) {
  const navigate = useNavigate();

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
      <TemplateFormView
        projectId={projectId}
        gitRef={gitRef}
        path={path}
        value={template}
        onExecute={onExecute}
        onTemplateClick={async (template) => {
          const filepath = Object.values(store.tree).find((i) => i?.endsWith(`${template.id}.yaml`));
          if (filepath) navigate(filepath);
        }}
      />
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
  z-index: ${({ theme }) => theme.zIndex.tooltip};
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

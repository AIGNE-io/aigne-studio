import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Conversation, ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import { ArrowBackIosNew, DragIndicator, HighlightOff, Start } from '@mui/icons-material';
import { Alert, Box, Breadcrumbs, Button, CircularProgress, Divider, Link, Tooltip, Typography } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { ReactNode, useCallback, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
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

  const {
    state: { loading, project },
    refetch,
  } = useProjectState(projectId, gitRef);

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

  const { t } = useLocaleContext();

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

  return (
    <Box height="100%">
      <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal">
        <Box component={Panel} defaultSize={10} minSize={10}>
          <Box py={2} px={1}>
            <Breadcrumbs>
              <Link component={RouterLink} underline="hover" to="../.." sx={{ display: 'flex', alignItems: 'center' }}>
                <ArrowBackIosNew sx={{ mr: 0.5, fontSize: 18 }} />
                {t('form.project')}
              </Link>
              <Typography color="text.primary">
                {loading ? <CircularProgress size={14} /> : project?.name || t('alert.unnamed')}
              </Typography>
            </Breadcrumbs>
          </Box>

          <Divider />

          <FileTree
            projectId={projectId}
            gitRef={gitRef}
            mutable={!disableMutation}
            current={filepath}
            sx={{ height: '100%', overflow: 'auto' }}
            onLaunch={assistant ? onLaunch : undefined}
          />
        </Box>
        <ResizeHandle />
        <Box component={Panel} minSize={30}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {filepath && <TemplateEditor projectId={projectId} gitRef={gitRef} path={filepath} onExecute={onExecute} />}
          </Box>
        </Box>

        <ResizeHandle />

        <Box component={Panel} defaultSize={45} minSize={20}>
          <Conversation
            ref={conversation}
            messages={messages}
            sx={{ height: '100%', overflow: 'auto' }}
            onSubmit={(prompt) => add(prompt)}
            customActions={customActions}
          />
        </Box>
      </Box>
    </Box>
  );
}

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

function ResizeHandle() {
  return (
    <Box
      component={PanelResizeHandle}
      sx={{
        width: 10,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.200',
        opacity: 0.6,
        ':hover': {
          opacity: 1,
        },
      }}>
      <DragIndicator sx={{ fontSize: 14 }} />
    </Box>
  );
}

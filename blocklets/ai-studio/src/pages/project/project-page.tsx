import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Conversation, ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import Header from '@blocklet/ui-react/lib/Header';
import {
  ArrowBackIosNew,
  ArrowDropDown,
  Download,
  DragIndicator,
  HighlightOff,
  History,
  InfoOutlined,
  Start,
  Upload,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  BoxProps,
  Breadcrumbs,
  Button,
  CircularProgress,
  Divider,
  Link,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import uniqBy from 'lodash/uniqBy';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';
import { parse } from 'yaml';

import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView from '../../components/template-form';
import CommitsTip from '../../components/template-form/commits-tip';
import { useComponent } from '../../contexts/component';
import { useIsAdmin } from '../../contexts/session';
import { callAI, imageGenerations, textCompletions } from '../../libs/ai';
import { getErrorMessage } from '../../libs/api';
import { importBodySchema } from '../../libs/import';
import { commitFromWorking } from '../../libs/working';
import useDialog from '../../utils/use-dialog';
import usePickFile, { readFileAsText } from '../../utils/use-pick-file';
import BranchButton from './branch-button';
import { useExportFiles } from './export-files';
import FileTree from './file-tree';
import MenuButton from './menu-button';
import SaveButton from './save-button';
import { useProjectState } from './state';
import { StoreProvider, importFiles, isTemplate, useStore } from './yjs-state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref, '*': filepath } = useParams();
  if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

  return (
    <StoreProvider projectId={projectId} gitRef={ref}>
      <ProjectView projectId={projectId} gitRef={ref} filepath={filepath} />
    </StoreProvider>
  );
}

function ProjectView({ projectId, gitRef, filepath }: { projectId: string; gitRef: string; filepath?: string }) {
  const { store, ready } = useStore();

  const {
    state: { branches, loading, project, commits },
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
  }, [gitRef, ready, location]);

  useEffect(() => {
    if (filepath) setPreviousFilePath((v) => ({ ...v, [gitRef]: filepath }));
  }, [gitRef, filepath, setPreviousFilePath]);

  const { t } = useLocaleContext();

  const { dialog, showDialog } = useDialog();

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

  const onExecute = async (template: Template) => {
    const { parameters } = template;
    const question = parameters?.question?.value;

    add(question?.toString() || '', { template, path: filepath });
  };

  const assistant = useComponent('ai-assistant');

  const onLaunch = useCallback(
    async (template: Template) => {
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

  const { exporter, exportFiles } = useExportFiles();

  const pickFile = usePickFile();

  const onImport = useCallback(
    async (path?: string[]) => {
      try {
        const list = await pickFile({ accept: '.yaml,.yml', multiple: true }).then((files) =>
          Promise.all(
            files.map((i) =>
              readFileAsText(i).then((i) => {
                const obj = parse(i);

                // 用于兼容比较旧的导出数据
                // {
                //   templates: {
                //     folderId?: string
                //   }[]
                //   folders: {
                //     _id: string
                //     name?: string
                //   }[]
                // }
                if (Array.isArray(obj?.templates) && Array.isArray(obj?.folders)) {
                  obj.templates.forEach((template: any) => {
                    if (template.folderId) {
                      const folder = obj.folders.find((f: any) => f._id === template.folderId);
                      if (folder.name) {
                        template.path = folder.name;
                      }
                    }
                  });
                }

                return importBodySchema.validateAsync(obj, { stripUnknown: true });
              })
            )
          )
        );

        const templates = uniqBy(
          list.flatMap((i) => i.templates ?? []),
          'id'
        ).map((i) => ({ ...i, path: i.path?.split('/') }));

        const existedTemplateIds = new Set(
          Object.values(store.files)
            .filter(isTemplate)
            .map((i) => i.id)
        );

        const renderTemplateItem = ({
          template,
          ...props
        }: { template: Template & { path?: string[] } } & BoxProps) => {
          return (
            <Box {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexShrink: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Typography color="text.secondary" component="span">
                    {template.path?.length ? `${template.path.join('/')}/` : ''}
                  </Typography>

                  {template.name || t('alert.unnamed')}
                </Box>

                {existedTemplateIds.has(template.id) && (
                  <Tooltip
                    title={
                      <>
                        <Box component="span">{t('alert.overwrittenTip')}</Box>
                        <Box
                          component="a"
                          sx={{
                            ml: 1,
                            userSelect: 'none',
                            color: 'white',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            ':hover': { opacity: 0.6 },
                          }}
                          onClick={() => {
                            const path = Object.values(store.tree).find(
                              (i) => i?.split('/').slice(-1)[0] === `${template.id}.yaml`
                            );
                            if (path) {
                              exportFiles(path.split('/'), { quiet: true });
                            }
                          }}>
                          {t('alert.downloadBackup')}
                        </Box>
                      </>
                    }>
                    <InfoOutlined color="warning" fontSize="small" sx={{ mx: 1 }} />
                  </Tooltip>
                )}
              </Box>
            </Box>
          );
        };

        showDialog({
          fullWidth: true,
          maxWidth: 'sm',
          title: t('alert.import'),
          content: (
            <Box>
              <Typography>{t('alert.importTip')}</Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {templates.map((template) =>
                  renderTemplateItem({
                    key: template.id,
                    component: 'li',
                    template,
                  })
                )}
              </Box>
            </Box>
          ),
          cancelText: t('alert.cancel'),
          okText: t('alert.import'),
          onOk: async () => {
            try {
              importFiles({ store, parent: path, files: templates });
              // await importTemplates({ projectId, branch: gitRef, path: path?.join('/') || '', templates });

              Toast.success(t('alert.imported'));
            } catch (error) {
              Toast.error(getErrorMessage(error));
              throw error;
            }
          },
        });
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [pickFile, store, showDialog, t, exportFiles]
  );

  const { dialog: createBranchDialog, showDialog: showCreateBranchDialog } = useDialog();

  const showCreateBranch = useCallback(async () => {
    return new Promise<string | null>((resolve) => {
      let name = '';

      showCreateBranchDialog({
        maxWidth: 'sm',
        fullWidth: true,
        title: `${t('form.new')} ${t('form.branch')}`,
        content: (
          <Box>
            <TextField label={t('form.name')} onChange={(e) => (name = e.target.value)} />
          </Box>
        ),
        okText: t('form.save'),
        cancelText: t('alert.cancel'),
        onOk: async () => {
          try {
            resolve(name);
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
        onCancel: () => resolve(null),
      });
    });
  }, [showCreateBranchDialog, t]);

  const [committing, setCommitting] = useState(false);

  const save = useCallback(
    async ({ newBranch }: { newBranch?: boolean } = {}) => {
      setCommitting(true);
      try {
        const branch = !newBranch ? gitRef : await showCreateBranch();
        if (!branch) return;

        await commitFromWorking({
          projectId,
          ref: gitRef,
          input: {
            branch,
            message: new Date().toLocaleString(),
          },
        });

        Toast.success(t('alert.saved'));
        if (branch !== gitRef) navigate(joinUrl('..', branch), { replace: true });
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      } finally {
        setCommitting(false);
      }
    },
    [gitRef, navigate, projectId, showCreateBranch, t]
  );

  const addons = ([...addons]: ReactNode[]) => {
    addons.unshift(
      <BranchButton projectId={projectId} gitRef={gitRef} filepath={filepath} />,

      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinUrl('..', commit.oid), { state: { filepath } });
        }}>
        <Button startIcon={<History />} endIcon={<ArrowDropDown fontSize="small" />}>
          {t('alert.history')}
        </Button>
      </CommitsTip>,

      <SaveButton
        disabled={disableMutation || !branches.includes(gitRef)}
        loading={committing}
        changed
        onSave={save}
      />,

      <MenuButton
        menus={[
          {
            icon: <Upload />,
            title: t('alert.import'),
            disabled: disableMutation,
            onClick: () => onImport(),
          },
          {
            icon: <Download />,
            title: t('alert.export'),
            onClick: () => exportFiles(),
          },
        ]}
      />
    );

    return addons;
  };

  return (
    <>
      <Box
        component={Header}
        sx={{
          position: 'sticky',
          top: 0,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          '>.header-container': { maxWidth: 'none' },
        }}
        addons={addons}
      />

      {createBranchDialog}
      {dialog}
      {exporter}

      <Box sx={{ position: 'absolute', left: 0, top: 64, right: 0, bottom: 0 }}>
        <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal">
          <Box component={Panel} defaultSize={10} minSize={10}>
            <Box py={2} px={1}>
              <Breadcrumbs>
                <Link
                  component={RouterLink}
                  underline="hover"
                  to="../.."
                  sx={{ display: 'flex', alignItems: 'center' }}>
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
              mutable={!disableMutation}
              current={filepath}
              sx={{ height: '100%', overflow: 'auto' }}
              onExport={exportFiles}
              onLaunch={onLaunch}
              onImport={onImport}
            />
          </Box>
          <ResizeHandle />
          <Box component={Panel} minSize={30}>
            <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              {filepath && <TemplateEditor projectId={projectId} _ref={gitRef} path={filepath} onExecute={onExecute} />}
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
    </>
  );
}

function TemplateEditor({
  projectId,
  _ref: ref,
  path,
  onExecute,
}: {
  projectId: string;
  _ref: string;
  path: string;
  onExecute: (template: Template) => any;
}) {
  const navigate = useNavigate();

  const { store, ready } = useStore();
  if (!ready) return null;

  const id = Object.entries(store.tree).find((i) => i[1] === path)?.[0];
  const template = id ? store.files[id] : undefined;
  if (!template || !isTemplate(template)) return <Alert color="error">Not Found</Alert>;

  return (
    <TemplateFormView
      projectId={projectId}
      _ref={ref}
      path={path}
      value={template}
      onExecute={onExecute}
      onTemplateClick={async (template) => {
        const filepath = Object.values(store.tree).find((i) => i?.endsWith(`${template.id}.yaml`));
        if (filepath) navigate(filepath);
      }}
    />
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

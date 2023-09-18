import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Conversation, ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import {
  ArrowBackIosNew,
  ArrowDropDown,
  CallSplit,
  Delete,
  Download,
  DragIndicator,
  Edit,
  HighlightOff,
  History,
  InfoOutlined,
  Save,
  SaveAs,
  Start,
  Upload,
  WarningRounded,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Box,
  BoxProps,
  Breadcrumbs,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  tooltipClasses,
} from '@mui/material';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { useAsyncEffect, useLocalStorageState } from 'ahooks';
import equal from 'fast-deep-equal';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import { omit, uniqBy } from 'lodash';
import {
  ReactNode,
  forwardRef,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Link as RouterLink, useBeforeUnload, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUpdate } from 'react-use';
import joinUrl from 'url-join';
import { parse } from 'yaml';

import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView from '../../components/template-form';
import CommitsTip from '../../components/template-form/commits-tip';
import Dropdown from '../../components/template-form/dropdown';
import { useComponent } from '../../contexts/component';
import { useAddon } from '../../contexts/dashboard';
import { useIsAdmin } from '../../contexts/session';
import { callAI, imageGenerations, textCompletions } from '../../libs/ai';
import { getErrorMessage } from '../../libs/api';
import { importBodySchema, importTemplates } from '../../libs/import';
import { Commit } from '../../libs/log';
import { getFile } from '../../libs/tree';
import useDialog from '../../utils/use-dialog';
import usePickFile, { readFileAsText } from '../../utils/use-pick-file';
import { useExportFiles } from './export-files';
import FileTree, { TreeNode } from './file-tree';
import { useProjectState } from './state';

const defaultBranch = 'main';

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref, '*': filepath } = useParams();
  if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

  const {
    state: { project, files, branches, commits, loading },
    refetch,
    createFile,
    deleteFile,
  } = useProjectState(projectId, ref);

  const isAdmin = useIsAdmin();
  const disableMutation = ref === defaultBranch && !isAdmin;

  const location = useLocation();
  const navigate = useNavigate();

  const [previousFilePath, setPreviousFilePath] = useLocalStorageState<{ [key: string]: string } | undefined>(
    PREVIOUS_FILE_PATH(projectId)
  );

  useEffect(() => {
    if (filepath) return;

    const p = location.state?.filepath || (ref === defaultBranch ? previousFilePath?.[ref] : undefined);

    if (p && typeof p === 'string') {
      const name = p.split('/').slice(-1)[0];
      const file = files.find((i): i is typeof i & { type: 'file' } => i.type === 'file' && i.name === name);
      if (file) navigate(joinUrl(...file.parent, file.name), { replace: true });
    }
  }, [ref, files, location]);

  useEffect(() => {
    if (filepath) setPreviousFilePath((v) => ({ ...v, [ref]: filepath }));
  }, [ref, filepath, setPreviousFilePath]);

  const { t } = useLocaleContext();

  const { dialog, showDialog } = useDialog();

  const conversation = useRef<ConversationRef>(null);
  const editor = useRef<TemplateEditorInstance>(null);

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

      if (!(await editor.current?.requireSave())) return;

      const mode = `${template.mode === 'chat' ? 'chat' : 'templates'}`;

      window.open(
        `${assistant.mountPoint}/projects/${projectId}/${ref}/${mode}/${template.id}?source=studio`,
        '_blank'
      );
    },
    [assistant, projectId, ref]
  );

  const { exporter, exportFiles } = useExportFiles();

  const onExport = useCallback(
    async (node?: TreeNode | string, { quiet }: { quiet?: boolean } = {}) => {
      if (!(await editor.current?.requireSave())) return;

      exportFiles(projectId, ref, node, { quiet });
    },
    [exportFiles, projectId, ref]
  );

  const pickFile = usePickFile();

  const onImport = useCallback(
    async (path?: string[]) => {
      if (editor.current && !(await editor.current?.requireSave())) return;

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
        );

        const existedTemplateIds = new Set(
          files.filter((i): i is typeof i & { type: 'file' } => i.type === 'file').map((i) => i.meta.id)
        );

        const renderTemplateItem = ({ template, ...props }: { template: Template & { path?: string } } & BoxProps) => {
          return (
            <Box {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexShrink: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Typography color="text.secondary" component="span">
                    {template.path ? `${template.path}/` : ''}
                  </Typography>

                  {template.name || template.id}
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
                          onClick={() => onExport(template.id, { quiet: true })}>
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
              await importTemplates({ projectId, branch: ref, path: path?.join('/') || '', templates });
              editor.current?.reload();
              await refetch();
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
    [files, onExport, pickFile, projectId, ref, refetch, showDialog, t]
  );

  useAddon(
    'import',
    useMemo(
      () => (
        <Button disabled={!branches.includes(ref) || disableMutation} startIcon={<Upload />} onClick={() => onImport()}>
          {t('alert.import')}
        </Button>
      ),
      [disableMutation, branches, onImport, ref, t]
    ),
    10
  );

  useAddon(
    'export',
    useMemo(
      () => (
        <Button startIcon={<Download />} onClick={() => onExport()}>
          {t('alert.export')}
        </Button>
      ),
      [branches, onExport, ref, t]
    ),
    11
  );

  useAddon(
    'branches',
    useMemo(
      () => (
        <Dropdown
          sx={{
            [`.${tooltipClasses.tooltip}`]: {
              minWidth: 200,
              maxHeight: '60vh',
              overflow: 'auto',
            },
          }}
          dropdown={
            <BranchList
              projectId={projectId}
              _ref={ref}
              onItemClick={(branch) => branch !== ref && navigate(joinUrl('..', branch), { state: { filepath } })}
              onShowAllClick={() => {
                showDialog({
                  maxWidth: 'sm',
                  fullWidth: true,
                  title: t('form.branch'),
                  content: <AllBranches projectId={projectId} _ref={ref} filepath={filepath} />,
                  cancelText: t('alert.close'),
                });
              }}
            />
          }>
          <Button startIcon={<CallSplit />} endIcon={<ArrowDropDown fontSize="small" />}>
            <Box
              component="span"
              sx={{
                display: 'block',
                maxWidth: 80,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
              {ref}
            </Box>
          </Button>
        </Dropdown>
      ),
      [filepath, navigate, projectId, ref]
    ),
    2
  );

  useAddon(
    'commits',
    useMemo(
      () => (
        <CommitsTip
          loading={loading}
          commits={commits}
          hash={ref}
          onCommitSelect={(commit) => {
            navigate(joinUrl('..', commit.oid), { state: { filepath } });
          }}>
          <Button startIcon={<History />} endIcon={<ArrowDropDown fontSize="small" />}>
            {t('alert.history')}
          </Button>
        </CommitsTip>
      ),
      [commits, filepath, navigate, ref, t]
    ),
    3
  );

  return (
    <>
      {dialog}
      {exporter}

      <Box
        component={PanelGroup}
        autoSaveId="ai-studio-template-layouts"
        direction="horizontal"
        sx={{ height: '100%' }}>
        <Box component={Panel} defaultSize={10} minSize={10}>
          <Box py={2} px={1}>
            <Breadcrumbs>
              <Link component={RouterLink} underline="hover" to="../.." sx={{ display: 'flex', alignItems: 'center' }}>
                <ArrowBackIosNew sx={{ mr: 0.5, fontSize: 18 }} />
                {t('form.project')}
              </Link>
              <Typography color="text.primary">
                {project ? project.name || 'Unnamed' : <CircularProgress size={14} />}
              </Typography>
            </Breadcrumbs>
          </Box>

          <Divider />

          <FileTree
            disabled={!branches.includes(ref)}
            current={filepath}
            projectId={projectId}
            _ref={ref}
            sx={{ height: '100%', overflow: 'auto' }}
            className="list"
            onCreate={
              disableMutation
                ? undefined
                : async (data, path) => {
                    try {
                      const res = await createFile({
                        projectId,
                        branch: ref,
                        path: path?.join('/') || '',
                        input: { type: 'file', data: data ?? {} },
                      });
                      navigate(joinUrl('.', ...(path ?? []), `${res.id}.yaml`));
                    } catch (error) {
                      Toast.error(getErrorMessage(error));
                      throw error;
                    }
                  }
            }
            onExport={onExport}
            onImport={disableMutation ? undefined : onImport}
            onRemoveFolder={
              disableMutation
                ? undefined
                : (path, children) => {
                    showDialog({
                      maxWidth: 'xs',
                      fullWidth: true,
                      title: (
                        <Box>
                          <WarningRounded color="warning" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />

                          {t('alert.deleteTemplates')}
                        </Box>
                      ),
                      content: (
                        <Box component="ul" sx={{ pl: 2, my: 0 }}>
                          <Box component="li">
                            <Box>{path.join('/')}</Box>

                            <Box component="ul">
                              {children.map((item) => (
                                <Box key={item.id} component="li" sx={{ wordWrap: 'break-word' }}>
                                  {(item.data?.type === 'file' && item.data.meta.name) || item.text}
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        </Box>
                      ),
                      okText: t('alert.delete'),
                      okColor: 'error',
                      cancelText: t('alert.cancel'),
                      onOk: async () => {
                        try {
                          await deleteFile({ projectId, branch: ref, path: path.join('/') });
                          if (
                            children.some((i) => i.data && i.data.parent.concat(i.data.name).join('/') === filepath)
                          ) {
                            navigate('.');
                          }
                          Toast.success(t('alert.deleted'));
                        } catch (error) {
                          Toast.error(getErrorMessage(error));
                          throw error;
                        }
                      },
                    });
                  }
            }
            onDelete={
              disableMutation
                ? undefined
                : (template, path) => {
                    const referrers = files.filter(
                      (i): i is typeof i & { type: 'file' } =>
                        i.type === 'file' &&
                        i.meta.type === 'branch' &&
                        !!i.meta.branch?.branches.some((j) => j.template?.id === template.id)
                    );

                    showDialog({
                      maxWidth: 'xs',
                      fullWidth: true,
                      title: (
                        <Box sx={{ wordWrap: 'break-word' }}>
                          <WarningRounded color="warning" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />

                          {t('alert.deleteTemplate', { template: template.name || template.id })}
                        </Box>
                      ),
                      content: referrers.length ? (
                        <>
                          {t('alert.deleteTemplateContent', { references: referrers.length })}
                          <ul>
                            {referrers.map((file) => (
                              <Box key={file.meta.id} component="li">
                                {file.meta.name || file.meta.id}
                              </Box>
                            ))}
                          </ul>
                        </>
                      ) : undefined,
                      okText: t('alert.delete'),
                      okColor: 'error',
                      cancelText: t('alert.cancel'),
                      onOk: async () => {
                        try {
                          const p = joinUrl(...path);
                          await deleteFile({ projectId, branch: ref, path: p });
                          if (p === filepath) navigate('.');
                          Toast.success(t('alert.deleted'));
                        } catch (error) {
                          Toast.error(getErrorMessage(error));
                          throw error;
                        }
                      },
                    });
                  }
            }
            onClick={async (_, p) => {
              if (!disableMutation && editor.current && !(await editor.current.requireSave())) return;
              const to = p.join('/');
              if (to !== filepath) navigate(to);
            }}
            onLaunch={assistant && onLaunch}
          />
        </Box>
        <ResizeHandle />
        <Box component={Panel} minSize={30}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {branches.length > 0 && !branches.includes(ref) && (
              <Box sx={{ position: 'sticky', zIndex: 10, top: 0, mb: 2, bgcolor: 'background.paper' }}>
                <Alert color="warning">{t('alert.onBranchTip')}</Alert>
              </Box>
            )}

            {filepath && (
              <TemplateEditor projectId={projectId} ref={editor} _ref={ref} path={filepath} onExecute={onExecute} />
            )}
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
    </>
  );
}

function BranchList({
  projectId,
  _ref: ref,
  onItemClick,
  onShowAllClick,
}: {
  projectId: string;
  _ref: string;
  onItemClick?: (branch: string) => any;
  onShowAllClick?: () => any;
}) {
  const { t } = useLocaleContext();

  const {
    state: { branches },
  } = useProjectState(projectId, ref);

  return (
    <List disablePadding dense>
      {branches.map((branch) => (
        <ListItemButton key={branch} selected={branch === ref} onClick={() => onItemClick?.(branch)}>
          <ListItemText primary={branch} primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      ))}
      {onShowAllClick && (
        <ListItemButton onClick={onShowAllClick}>
          <ListItemText
            primary={t('alert.showAllBranches')}
            primaryTypographyProps={{ noWrap: true, textAlign: 'center', color: 'primary.main' }}
          />
        </ListItemButton>
      )}
    </List>
  );
}

interface TemplateEditorInstance {
  requireSave: () => Promise<boolean>;
  reload: () => Promise<Template>;
}

const TemplateEditor = forwardRef<
  TemplateEditorInstance,
  { projectId: string; _ref: string; path: string; onExecute: (template: Template) => any }
>(({ projectId, _ref: ref, path, onExecute }, _ref) => {
  const isAdmin = useIsAdmin();
  const disableMutation = ref === defaultBranch && !isAdmin;

  const { t } = useLocaleContext();

  const navigate = useNavigate();

  const { dialog, showDialog } = useDialog();
  const { dialog: createBranchDialog, showDialog: showCreateBranchDialog } = useDialog();

  const [error, setError] = useState<Error>();

  const [submitting, setSubmitting] = useState(false);

  const { form, original, formChanged, deletedBranchTemplateIds, setForm, resetForm } = useFormState();

  const { state: projectState, putFile, createBranch } = useProjectState(projectId, ref);

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
            await createBranch({ projectId, input: { name, oid: ref } });
            resolve(name);
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
        onCancel: () => resolve(null),
      });
    });
  }, [createBranch, projectId, ref, showCreateBranchDialog, t]);

  const save = useCallback(
    async ({ newBranch }: { newBranch?: boolean } = {}) => {
      if (!newBranch && projectState.branches.includes(ref) && !formChanged.current) return;

      try {
        setSubmitting(true);
        const branch =
          !disableMutation && !newBranch && projectState.branches.includes(ref) ? ref : await showCreateBranch();
        if (!branch) return;

        if (formChanged.current) {
          const res = await putFile({
            projectId,
            ref: branch,
            path,
            data: {
              ...form.current,
              deleteEmptyTemplates: [...deletedBranchTemplateIds.current],
            },
          });

          resetForm(res);
          setHash(undefined);
        }
        Toast.success(t('alert.saved'));
        if (branch !== ref) navigate(joinUrl('..', branch, path));
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [
      disableMutation,
      projectState.branches,
      ref,
      formChanged,
      showCreateBranch,
      putFile,
      projectId,
      path,
      form,
      deletedBranchTemplateIds,
      resetForm,
      t,
      navigate,
    ]
  );

  const requireSave = useCallback(async () => {
    if (!formChanged.current) return true;

    const res = await new Promise<boolean>((resolve, reject) => {
      showDialog({
        maxWidth: 'xs',
        fullWidth: true,
        title: t('alert.saveChanges'),
        okText: t('form.save'),
        okColor: 'primary',
        cancelText: t('alert.cancel'),
        middleText: t('alert.discard'),
        middleColor: 'error',
        onOk: async () => {
          try {
            await save();
            resolve(true);
          } catch (error) {
            reject(error);
          }
        },
        onMiddleClick: () => {
          resetForm(original.current);
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    return res;
  }, [projectState.branches, ref, save, resetForm, showDialog, t]);

  const reload = useCallback(async () => {
    try {
      resetForm();
      setError(undefined);
      const res = await getFile({ projectId, ref, path });
      resetForm(res);
      return res;
    } catch (error) {
      setError(error);
      throw error;
    }
  }, [path, ref, resetForm]);

  useAsyncEffect(async () => {
    reload();
  }, [reload]);

  useImperativeHandle(_ref, () => ({ requireSave, reload }), [requireSave, reload]);

  useSaveShortcut(save);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (formChanged.current) e.returnValue = t('alert.discardChanges');
      },
      [formChanged.current, t]
    )
  );

  useAddon(
    'save',
    useMemo(() => {
      return (
        <LoadingButton
          disabled={disableMutation || (projectState.branches.includes(ref) && !formChanged.current)}
          loading={submitting}
          loadingPosition="start"
          startIcon={<Save />}
          onClick={() => save()}>
          {t('form.save')}
        </LoadingButton>
      );
    }, [disableMutation, formChanged.current, projectState.branches, ref, save, submitting, t]),
    0
  );

  useAddon(
    'new-branch',
    useMemo(
      () => (
        <Button startIcon={<SaveAs />} onClick={() => save({ newBranch: true })}>
          {formChanged.current ? t('alert.saveInNewBranch') : t('alert.newBranch')}
        </Button>
      ),
      [formChanged.current, save, t]
    ),
    1
  );

  const [hash, setHash] = useState<string>();

  const onCommitSelect = useCallback(
    async (commit: Commit) => {
      try {
        const res = await getFile({ projectId, ref: commit.oid, path });
        setHash(commit.oid);
        setForm(res);
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [path]
  );

  if (error) {
    return <Alert color="error">{getErrorMessage(error)}</Alert>;
  }

  if (!form.current) {
    return (
      <Box textAlign="center" my={10}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <>
      {dialog}
      {createBranchDialog}

      <TemplateFormView
        projectId={projectId}
        _ref={ref}
        path={path}
        hash={hash}
        value={form.current}
        onChange={setForm}
        onCommitSelect={onCommitSelect}
        onExecute={onExecute}
        onTemplateClick={async (template) => {
          const file = projectState.files.find((i) => i.type === 'file' && i.meta.id === template.id);
          if (file) {
            if (!(await requireSave())) return;
            navigate(joinUrl('.', ...file.parent, file.name));
          }
        }}
      />
    </>
  );
});

function useFormState() {
  const update = useUpdate();
  const original = useRef<Template>();
  const form = useRef<Template>();

  // deleted branch templates, used to delete referred templates after saving.
  const deletedBranchTemplateIds = useRef<Set<string>>(new Set());

  const setForm = useCallback(
    (recipe: Template | ((value: WritableDraft<Template>) => void)) => {
      if (typeof recipe === 'function' && !form.current) throw new Error('form not initialized');

      const branches =
        form.current?.branch?.branches.map((i) => i.template?.id).filter((i): i is NonNullable<typeof i> => !!i) ?? [];

      const newForm =
        typeof recipe === 'function'
          ? produce(form.current!, (draft) => {
              recipe(draft);
            })
          : recipe;

      const newBranches =
        newForm?.branch?.branches.map((i) => i.template?.id).filter((i): i is NonNullable<typeof i> => !!i) ?? [];

      for (const i of branches.filter((i) => !newBranches.includes(i))) {
        deletedBranchTemplateIds.current.add(i);
      }

      form.current = newForm;

      update();
    },
    [update]
  );

  const resetForm = useCallback(
    (template?: Template) => {
      form.current = template;
      original.current = template;
      deletedBranchTemplateIds.current.clear();
      update();
    },
    [update]
  );

  const formChanged = useRef(false);

  const f = useDeferredValue(form.current);
  const o = useDeferredValue(original.current);

  useEffect(() => {
    if (!f || !o) {
      formChanged.current = false;
      return;
    }

    const omitParameterValue = (v: Template) => ({
      ...v,
      parameters: Object.fromEntries(
        Object.entries(v?.parameters ?? {}).map(([key, val]) => [key, omit(val, 'value')])
      ),
    });

    formChanged.current = !equal(omitParameterValue(f), omitParameterValue(o));
  }, [f, o]);

  return { form, original, formChanged, deletedBranchTemplateIds, setForm, resetForm };
}

function useSaveShortcut(save: () => any) {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          save();
        }
      }
    };

    window.addEventListener('keydown', onKeydown);

    return () => window.removeEventListener('keydown', onKeydown);
  }, [save]);
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

function AllBranches({ projectId, _ref: ref, filepath }: { projectId: string; _ref: string; filepath?: string }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const dataGrid = useGridApiRef();

  const { dialog, showDialog } = useDialog();

  const { state, updateBranch, deleteBranch } = useProjectState(projectId, ref);

  const rows = useMemo(() => {
    return state.branches.map((branch) => ({ branch }));
  }, [state.branches]);

  const onDelete = useCallback(
    (branch: string) => {
      showDialog({
        maxWidth: 'sm',
        fullWidth: true,
        title: (
          <Box sx={{ wordWrap: 'break-word' }}>
            <WarningRounded color="warning" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />

            {t('alert.deleteBranch', { branch })}
          </Box>
        ),
        okText: t('alert.delete'),
        okColor: 'error',
        cancelText: t('alert.cancel'),
        onOk: async () => {
          try {
            await deleteBranch({ projectId, branch });
            if (branch === ref) navigate(joinUrl('../main', filepath || ''));
            Toast.success(t('alert.deleted'));
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
      });
    },
    [deleteBranch, filepath, navigate, projectId, ref, showDialog, t]
  );

  const columns = useMemo<GridColDef<{ branch: string }>[]>(() => {
    return [
      { flex: 1, field: 'branch', headerName: t('form.branch'), sortable: false, editable: true },
      {
        field: '',
        headerName: t('form.actions'),
        sortable: false,
        align: 'center',
        renderCell: ({ row }) => (
          <>
            <IconButton
              disabled={row.branch === defaultBranch}
              onClick={() => dataGrid.current.startCellEditMode({ id: row.branch, field: 'branch' })}>
              <Edit />
            </IconButton>
            <IconButton disabled={row.branch === defaultBranch} onClick={() => onDelete(row.branch)}>
              <Delete />
            </IconButton>
          </>
        ),
      },
    ];
  }, [dataGrid, onDelete, t]);

  return (
    <Box sx={{ height: '50vh' }}>
      {dialog}

      <DataGrid
        apiRef={dataGrid}
        getRowId={(v) => v.branch}
        rows={rows}
        columns={columns}
        hideFooterSelectedRowCount
        disableColumnMenu
        autoHeight
        isCellEditable={(p) => p.row.branch !== defaultBranch}
        pageSizeOptions={[10]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        processRowUpdate={(updated, old) => {
          const newName = updated.branch.trim();
          if (newName === old.branch) return old;
          return updateBranch({ projectId, branch: old.branch, input: { name: newName } }).then(() => {
            if (ref === old.branch) navigate(joinUrl('..', newName, filepath || ''));
            return { branch: newName };
          });
        }}
        onProcessRowUpdateError={(error) => Toast.error(getErrorMessage(error))}
      />
    </Box>
  );
}

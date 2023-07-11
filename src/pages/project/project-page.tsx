import { useFullPage } from '@arcblock/ux/lib/Layout/dashboard/full-page';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Conversation, ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import {
  ArrowDropDown,
  Download,
  DragIndicator,
  Fullscreen,
  FullscreenExit,
  HighlightOff,
  InfoOutlined,
  Save,
  Start,
  Upload,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, Box, BoxProps, Button, CircularProgress, IconButton, Tooltip, Typography } from '@mui/material';
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
import { useBeforeUnload, useNavigate, useParams } from 'react-router-dom';
import { useUpdate } from 'react-use';
import joinUrl from 'url-join';
import { parse } from 'yaml';

import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView from '../../components/template-form';
import CommitsTip from '../../components/template-form/commits-tip';
import { useComponent } from '../../contexts/component';
import { useAddon, useAddonsState } from '../../contexts/dashboard';
import { callAI, imageGenerations, textCompletions } from '../../libs/ai';
import { getErrorMessage } from '../../libs/api';
import { importBodySchema, importTemplates } from '../../libs/import';
import { Commit } from '../../libs/logs';
import { getFile } from '../../libs/tree';
import useDialog from '../../utils/use-dialog';
import usePickFile, { readFileAsText } from '../../utils/use-pick-file';
import { useExportFiles } from './export-files';
import FileTree, { TreeNode } from './file-tree';
import { useProjectState } from './state';

const PREVIOUS_FILE_PATH = 'ai-studio.previousFilePath';

export default function ProjectPage() {
  const { ref, '*': filepath } = useParams();
  if (!ref) throw new Error('Missing required params `ref`');

  const navigate = useNavigate();

  const [previousFilePath, setPreviousFilePath] = useLocalStorageState<{ [key: string]: string } | undefined>(
    PREVIOUS_FILE_PATH
  );

  useEffect(() => {
    const previous = previousFilePath?.[ref];
    if (!filepath && previous) navigate(joinUrl('.', previous));
  }, [ref]);

  useEffect(() => {
    if (filepath) setPreviousFilePath((v) => ({ ...v, [ref]: filepath }));
  }, [ref, filepath, setPreviousFilePath]);

  const { t } = useLocaleContext();

  const { dialog, showDialog } = useDialog();

  const {
    state: { files },
    refetch,
    createFile,
    deleteFile,
  } = useProjectState(ref);

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

      window.open(
        `${assistant.mountPoint}/${template.mode === 'chat' ? 'chat' : 'templates'}/${template.id}?source=studio`,
        '_blank'
      );
    },
    [assistant]
  );

  const { exporter, exportFiles } = useExportFiles();

  const onExport = useCallback(
    async (node?: TreeNode | string, { quiet }: { quiet?: boolean } = {}) => {
      if (!(await editor.current?.requireSave())) return;

      exportFiles(ref, node, { quiet });
    },
    [exportFiles, ref]
  );

  const pickFile = usePickFile();

  const onImport = useCallback(
    async (path?: string[]) => {
      if (!(await editor.current?.requireSave())) return;

      try {
        const list = await pickFile({ accept: '.yaml,.yml', multiple: true }).then((files) =>
          Promise.all(
            files.map((i) =>
              readFileAsText(i).then((i) => importBodySchema.validateAsync(parse(i), { stripUnknown: true }))
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

        const renderTemplateItem = ({ template, ...props }: { template: Template } & BoxProps) => {
          return (
            <Box {...props}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ flexShrink: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              await importTemplates({ branch: ref, path: path?.join('/') || '', templates });
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
    [files, pickFile, ref, refetch, showDialog, t]
  );

  const [{ addons }] = useAddonsState();

  const headerAddons = useCallback(
    ([...exists]: ReactNode[]) => {
      exists.unshift(...Object.values(addons));

      exists.unshift(
        <Button startIcon={<Upload />} onClick={() => onImport()}>
          {t('alert.import')}
        </Button>
      );

      exists.unshift(
        <Button startIcon={<Download />} onClick={() => onExport()}>
          {t('alert.export')}
        </Button>
      );

      exists.unshift(
        <CommitsTip
          _ref={ref}
          onCommitSelect={(commit) => {
            navigate(joinUrl('..', commit.oid));
          }}>
          <Button endIcon={<ArrowDropDown fontSize="small" />}>History</Button>
        </CommitsTip>
      );

      exists.unshift(<ToggleFullscreen />);

      return exists;
    },
    [addons]
  );

  return (
    <Root footerProps={{ className: 'dashboard-footer' }} headerAddons={headerAddons}>
      {dialog}
      {exporter}

      <Box
        component={PanelGroup}
        autoSaveId="ai-studio-template-layouts"
        direction="horizontal"
        sx={{ height: '100%' }}>
        <Box component={Panel} defaultSize={10} minSize={10}>
          <FileTree
            current={filepath}
            _ref={ref}
            sx={{ height: '100%', overflow: 'auto' }}
            className="list"
            onCreate={async (data, path) => {
              try {
                const res = await createFile({
                  branch: ref,
                  path: path?.join('/') || '',
                  input: { type: 'file', data: data ?? {} },
                });
                navigate(joinUrl('.', ...(path ?? []), `${res.id}.yaml`));
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            }}
            onExport={onExport}
            onImport={onImport}
            onRemoveFolder={(path, children) => {
              showDialog({
                maxWidth: 'xs',
                fullWidth: true,
                title: t('alert.delete'),
                content: (
                  <>
                    <Box>{t('alert.deleteTemplates')}</Box>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <Box component="li">
                        <Box>{path.join('/')}</Box>

                        <Box component="ul">
                          {children.map((item) => (
                            <Box key={item.id} component="li">
                              {item.text}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </>
                ),
                okText: t('alert.delete'),
                okColor: 'error',
                cancelText: t('alert.cancel'),
                onOk: async () => {
                  try {
                    await deleteFile({ branch: ref, path: path.join('/') });
                    if (children.some((i) => i.data && i.data.parent.concat(i.data.name).join('/') === filepath)) {
                      navigate('.');
                    }
                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  }
                },
              });
            }}
            onDelete={(template, path) => {
              const referrers = files.filter(
                (i): i is typeof i & { type: 'file' } =>
                  i.type === 'file' &&
                  i.meta.type === 'branch' &&
                  !!i.meta.branch?.branches.some((j) => j.template?.id === template.id)
              );

              showDialog({
                maxWidth: 'xs',
                fullWidth: true,
                title: t('alert.deleteTemplate', { template: template.name || template.id }),
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
                    await deleteFile({ branch: ref, path: p });
                    if (p === filepath) navigate('.');
                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  }
                },
              });
            }}
            onClick={async (_, p) => {
              if (editor.current && !(await editor.current.requireSave())) return;
              const to = p.join('/');
              if (to !== filepath) navigate(to);
            }}
            onLaunch={onLaunch}
          />
        </Box>
        <ResizeHandle />
        <Box component={Panel} minSize={30}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {filepath && <TemplateEditor ref={editor} _ref={ref} path={filepath} onExecute={onExecute} />}
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
    </Root>
  );
}

interface TemplateEditorInstance {
  requireSave: () => Promise<boolean>;
  reload: () => Promise<Template>;
}

const TemplateEditor = forwardRef<
  TemplateEditorInstance,
  { _ref: string; path: string; onExecute: (template: Template) => any }
>(({ _ref: ref, path, onExecute }, _ref) => {
  const { t } = useLocaleContext();

  const navigate = useNavigate();

  const { dialog, showDialog } = useDialog();

  const [error, setError] = useState<Error>();

  const [submitting, setSubmitting] = useState(false);

  const { form, original, formChanged, deletedBranchTemplateIds, setForm, resetForm } = useFormState();

  const { state: projectState, putFile } = useProjectState(ref);

  const save = useCallback(async () => {
    if (!formChanged.current) return;

    try {
      setSubmitting(true);
      const res = await putFile({
        ref,
        path,
        data: {
          ...form.current,
          deleteEmptyTemplates: [...deletedBranchTemplateIds.current],
        },
      });

      resetForm(res);
      Toast.success(t('alert.saved'));
    } catch (error) {
      Toast.error(getErrorMessage(error));
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [path, putFile, ref, resetForm, t]);

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
  }, [save, resetForm, showDialog, t]);

  const reload = useCallback(async () => {
    try {
      resetForm();
      setError(undefined);
      const res = await getFile({ ref, path });
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
          disabled={!formChanged.current}
          loading={submitting}
          loadingPosition="start"
          startIcon={<Save />}
          onClick={save}>
          {t('form.save')}
        </LoadingButton>
      );
    }, [formChanged.current, save, submitting, t])
  );

  const [hash, setHash] = useState<string>();

  const onCommitSelect = useCallback(
    async (commit: Commit) => {
      try {
        const res = await getFile({ ref: commit.oid, path });
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

      <TemplateFormView
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

const Root = styled(Dashboard)`
  > .dashboard-body > .dashboard-main {
    > .dashboard-content {
      overflow: hidden;
      padding: 0;
    }

    > .dashboard-footer {
      margin-top: 0;
      padding: 0;
    }
  }
`;

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

function ToggleFullscreen() {
  const { inFullPage, toggleFullPage } = useFullPage();

  return <IconButton onClick={toggleFullPage}>{inFullPage ? <FullscreenExit /> : <Fullscreen />}</IconButton>;
}

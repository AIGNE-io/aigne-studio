import { useFullPage } from '@arcblock/ux/lib/Layout/dashboard/full-page';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Conversation, ConversationRef, MessageItem, useConversation } from '@blocklet/ai-kit';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import {
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
import { Box, BoxProps, Button, IconButton, Tooltip, Typography } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import equal from 'fast-deep-equal';
import saveAs from 'file-saver';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import { groupBy, omit, uniqBy } from 'lodash';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useBeforeUnload, useNavigate, useSearchParams } from 'react-router-dom';
import { parse, stringify } from 'yaml';

import { Folder } from '../../../api/src/store/folders';
import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView, { TemplateForm } from '../../components/template-form';
import TemplateList, { TemplatesProvider, TreeNode, useTemplates } from '../../components/template-list';
import { useComponent } from '../../contexts/component';
import { ImageGenerationSize, callAI, imageGenerations, textCompletions } from '../../libs/ai';
import { getErrorMessage } from '../../libs/api';
import { importBodySchema } from '../../libs/import';
import useDialog from '../../utils/use-dialog';
import usePickFile, { readFileAsText } from '../../utils/use-pick-file';

const LATEST_TEMPLATE_ID_KEY = 'ai-studio.currentTemplateId';

export default function TemplatePage() {
  return (
    <TemplatesProvider>
      <TemplateView />
    </TemplatesProvider>
  );
}

function TemplateView() {
  const { t } = useLocaleContext();
  const ref = useRef<ConversationRef>(null);
  const { dialog, showDialog } = useDialog();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { messages, add, cancel } = useConversation({
    scrollToBottom: (o) => ref.current?.scrollToBottom(o),
    textCompletions: async (prompt, { meta }: { meta?: Template } = {}) => {
      if (!meta) {
        return textCompletions({
          ...(typeof prompt === 'string' ? { prompt } : { messages: prompt }),
          stream: true,
        });
      }
      return callAI({
        template: meta!,
        parameters: Object.fromEntries(
          Object.entries(meta!.parameters ?? {}).map(([key, val]) => [key, parameterToStringValue(val)])
        ),
      });
    },
    imageGenerations: (prompt) =>
      imageGenerations({ ...prompt, size: prompt.size as ImageGenerationSize, response_format: 'b64_json' }).then(
        (res) => res.data.map((i) => ({ url: `data:image/png;base64,${i.b64_json}` }))
      ),
  });

  const { templates, treeRef, submitting, create, update, remove, importTemplates, removeFolder, checkout } =
    useTemplates();
  const [current, setCurrentTemplate] = useState<Template>();
  const [form, setForm] = useState<Template>();

  // deleted branch templates, used to delete referred templates after saving.
  const deletedBranchTemplateIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    deletedBranchTemplateIds.current.clear();
    setForm(current);
  }, [current]);

  const setFormValue = useCallback(
    (update: Template | ((value: WritableDraft<Template>) => void)) => {
      setForm((form) => {
        const branches =
          form?.branch?.branches.map((i) => i.template?.id).filter((i): i is NonNullable<typeof i> => !!i) ?? [];

        const newForm =
          typeof update === 'function'
            ? produce(form, (draft) => {
                update(draft!);
              })
            : update;

        const newBranches =
          newForm?.branch?.branches.map((i) => i.template?.id).filter((i): i is NonNullable<typeof i> => !!i) ?? [];

        for (const i of branches.filter((i) => !newBranches.includes(i))) {
          deletedBranchTemplateIds.current.add(i);
        }
        return newForm;
      });
    },
    [setForm]
  );

  const formChanged = useMemo(() => {
    const omitParameterValue = (v: typeof form) => ({
      ...v,
      parameters: Object.fromEntries(
        Object.entries(v?.parameters ?? {}).map(([key, val]) => [key, omit(val, 'value')])
      ),
    });

    return !equal(omitParameterValue(form), omitParameterValue(current));
  }, [form]);
  const formChangedRef = useRef(formChanged);
  formChangedRef.current = formChanged;

  const setCurrent = useCallback(
    (template: Template, force = false) => {
      if (formChanged && !force) {
        showDialog({
          maxWidth: 'xs',
          fullWidth: true,
          title: t('alert.discardChanges'),
          okText: t('alert.discard'),
          okColor: 'error',
          cancelText: t('alert.cancel'),
          middleText: t('form.save'),
          middleColor: 'primary',
          onOk: () => {
            setCurrentTemplate(template);
          },
          onMiddleClick: async () => {
            await saveRef.current();
            setCurrentTemplate(template);
          },
          onCancel: () => {
            navigate(-1);
          },
        });
      } else {
        setCurrentTemplate(template);
      }
    },
    [formChanged]
  );

  useBeforeUnload(
    useCallback(
      (e) => {
        if (formChanged) {
          e.returnValue = t('alert.discardChanges');
        }
      },
      [formChanged]
    )
  );

  const to = useCallback(
    (templateId?: string, replace?: boolean) =>
      setSearchParams(
        (params) => {
          if (templateId) {
            params.set('templateId', templateId);
          } else {
            params.delete('templateId');
          }
          return params;
        },
        { replace }
      ),
    []
  );

  const templateId = searchParams.get('templateId');

  const [latestTemplateId, setLatestTemplateId] = useLocalStorageState<string | undefined>(LATEST_TEMPLATE_ID_KEY);

  // Set current template after templates loaded
  useEffect(() => {
    if (templateId) {
      setLatestTemplateId(templateId);
    }

    if (!templateId) {
      const template = templates.find((i) => i._id === latestTemplateId) || templates[0];
      if (template) to(template._id, true);
      return;
    }
    if (templates.length && !templates.some((i) => i._id === templateId)) {
      const template = templates[0];
      if (template) to(template._id, true);
      else to(undefined, true);
      return;
    }
    if (current?._id !== templateId) {
      const tpl = templates.find((i) => i._id === templateId);
      if (tpl) setCurrent(tpl);
    }
  }, [templates, templateId]);

  const onExecute = async (template: TemplateForm) => {
    const { parameters } = template;
    const question = parameters?.question?.value;

    add(question?.toString() || '', template);
  };

  const customActions = useCallback(
    (msg: MessageItem): [ReactNode[], ReactNode[]] => {
      return [
        [],
        [
          msg.meta?._id && (
            <Tooltip key="template" title="Use current template" placement="top">
              <Button
                size="small"
                onClick={() => {
                  const tpl = templates.find((i) => i._id === msg.meta?._id);
                  if (tpl && tpl._id !== current?._id) {
                    to(tpl._id);
                  }
                }}>
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
    [cancel]
  );

  const save = useCallback(async () => {
    try {
      if (form?._id) {
        const template = await update(form._id, {
          ...form,
          deleteEmptyTemplates: [...deletedBranchTemplateIds.current],
        });
        setCurrentTemplate(template);
        setForm(template);
        Toast.success(t('alert.saved'));
      }
    } catch (error) {
      Toast.error(getErrorMessage(error));
      throw error;
    }
  }, [form, t, update]);

  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveRef.current();
        }
      }
    };

    window.addEventListener('keydown', onKeydown);

    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  const assistant = useComponent('ai-assistant');

  const requireSave = useCallback(async () => {
    if (!formChangedRef.current) {
      return true;
    }
    return new Promise<boolean>((resolve, reject) => {
      showDialog({
        maxWidth: 'xs',
        fullWidth: true,
        title: t('alert.discardChanges'),
        okText: t('form.save'),
        okColor: 'primary',
        cancelText: t('alert.cancel'),
        middleText: t('alert.discard'),
        middleColor: 'error',
        onOk: async () => {
          try {
            await saveRef.current();
            resolve(true);
          } catch (error) {
            reject(error);
          }
        },
        onMiddleClick: () => {
          setForm(current);
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
  }, [current, showDialog, t]);

  const onLaunch = useCallback(
    async (template: Template) => {
      if (!assistant) {
        return;
      }

      if (!(await requireSave())) return;

      const t = treeRef.current.find((i) => i.id === template._id)?.data?.data as Template;
      if (!t) {
        throw new Error(`Template ${template._id} does not exist`);
        return;
      }

      window.open(
        `${assistant.mountPoint}/${t.mode === 'chat' ? 'chat' : 'templates'}/${t._id}?source=studio`,
        '_blank'
      );
    },
    [assistant, requireSave, treeRef]
  );

  const onExport = useCallback(
    async (node?: TreeNode | { type: 'template'; id: string }, { quiet }: { quiet?: boolean } = {}) => {
      if (!(await requireSave())) return;

      const all = {
        templates: treeRef.current
          .filter((i): i is Required<typeof i> & { data: { type: 'template' } } => i.data?.type === 'template')
          .map((i) => i.data?.data),
        folders: treeRef.current
          .filter((i): i is Required<typeof i> & { data: { type: 'folder' } } => i.data?.type === 'folder')
          .map((i) => i.data?.data),
      };

      const isTemplate = (n: typeof node): n is { type: 'template'; id: string } => (n as any)?.type === 'template';

      const result: { folders?: Folder[]; templates: Template[] } = isTemplate(node)
        ? { templates: all.templates.filter((i) => i._id === node.id) }
        : !node?.data
        ? all
        : node.data.type === 'template'
        ? { templates: all.templates.filter((i) => i._id === node.data?.data._id) }
        : { templates: all.templates.filter((i) => i.folderId === node.id) };

      for (let i = 0; i < result.templates.length; i++) {
        const current = result.templates[i]!;
        if (current.branch?.branches.length) {
          for (const { template } of current.branch.branches) {
            if (template && !result.templates.some((i) => i._id === template.id)) {
              const t = all.templates.find((i) => i._id === template.id);
              if (t) result.templates.push(t);
            }
          }
        }
      }

      const group = groupBy(result.templates, 'folderId');

      if (!result.folders) {
        const folderIds = Object.keys(group);
        result.folders = all.folders.filter((i) => folderIds.includes(i._id!));
      }

      if (!result.templates.length) {
        Toast.error('No templates to export');
        return;
      }

      const rootTemplates = result.templates.filter((i) => !result.folders?.some((j) => j._id === i.folderId));

      const doExport = () => {
        const str = stringify(result);
        const filename =
          (node?.id &&
            (all.folders.find((i) => i._id === node.id)?.name ?? all.templates.find((i) => i._id === node.id)?.name)) ||
          node?.id ||
          `templates-${Date.now()}`;
        saveAs(new Blob([str]), `${filename}.yml`);
      };

      if (quiet) {
        doExport();
        return;
      }
      showDialog({
        fullWidth: true,
        maxWidth: 'sm',
        title: t('alert.export'),
        content: (
          <Box>
            <Typography>{t('alert.exportTip')}</Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              {result.folders.map((folder) => (
                <Box key={folder!._id} component="li">
                  <Box>{folder.name || folder._id}</Box>
                  <Box component="ul">
                    {group[folder._id!]?.map((template) => (
                      <Box key={template._id} component="li">
                        {template.name || template._id}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}

              {rootTemplates.length > 0 && (
                <Box component="li">
                  <Box>/</Box>
                  <Box component="ul">
                    {rootTemplates.map((template) => (
                      <Box key={template._id} component="li">
                        {template.name || template._id}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        ),
        cancelText: t('alert.cancel'),
        okText: t('alert.export'),
        onOk: () => doExport(),
      });
    },
    [requireSave, treeRef, t, showDialog]
  );

  const pickFile = usePickFile();

  const onImport = useCallback(async () => {
    if (!(await requireSave())) return;

    try {
      const files = await pickFile({ accept: '.yaml', multiple: true });
      const list = await Promise.all(
        (await Promise.all(files.map((i) => readFileAsText(i))))
          .map((i) => parse(i))
          .map(async (obj) => importBodySchema.validateAsync(obj, { stripUnknown: true }))
      );
      const merged = list.reduce((res, i) => ({
        folders: (res.folders ?? []).concat(i.folders ?? []),
        templates: (res.templates ?? []).concat(i.templates ?? []),
      }));
      merged.folders = uniqBy(merged.folders, '_id');
      merged.templates = uniqBy(merged.templates, '_id');

      const group = groupBy(merged.templates, 'folderId');

      const rootTemplates = merged.templates.filter((i) => !merged.folders?.some((j) => i.folderId === j._id));

      const existedTemplateIds = new Set(treeRef.current.map((i) => i.id));

      const renderTemplateItem = ({ template, ...props }: { template: Template } & BoxProps) => {
        return (
          <Box {...props} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ flexShrink: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {template.name || template._id}
            </Box>

            {existedTemplateIds.has(template._id) && (
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
                      onClick={() => onExport({ type: 'template', id: template._id }, { quiet: true })}>
                      {t('alert.downloadBackup')}
                    </Box>
                  </>
                }>
                <InfoOutlined color="warning" fontSize="small" sx={{ mx: 1 }} />
              </Tooltip>
            )}
          </Box>
        );
      };

      const renderFolder = ({ title, templates, ...props }: { title: string; templates: Template[] } & BoxProps) => {
        return (
          <Box {...props}>
            <Box>{title}</Box>
            <Box component="ul">
              {templates.map((template) =>
                renderTemplateItem({
                  key: template._id,
                  component: 'li',
                  template,
                })
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
              {merged.folders.map((folder) =>
                renderFolder({
                  key: folder._id,
                  title: folder.name || folder._id!,
                  component: 'li',
                  templates: group[folder._id!] ?? [],
                })
              )}

              {rootTemplates.length > 0 &&
                renderFolder({
                  title: '/',
                  component: 'li',
                  templates: rootTemplates,
                })}
            </Box>
          </Box>
        ),
        cancelText: t('alert.cancel'),
        okText: t('alert.import'),
        onOk: async () => {
          try {
            await importTemplates(merged);
            Toast.success(t('alert.imported'));
            const current = templateId
              ? treeRef.current.find(
                  (i): i is TreeNode & { data: { type: 'template' } } => i.data?.data._id === templateId
                )?.data?.data
              : null;
            if (current) {
              setCurrent(current);
            }
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
  }, [importTemplates, onExport, pickFile, requireSave, showDialog, t, treeRef]);

  const headerAddons = useCallback(
    ([...exists]: ReactNode[]) => {
      exists.unshift(
        <LoadingButton
          disabled={!formChanged}
          loading={submitting}
          loadingPosition="start"
          startIcon={<Save />}
          onClick={save}>
          {t('form.save')}
        </LoadingButton>
      );

      exists.unshift(
        <Button startIcon={<Upload />} onClick={onImport}>
          {t('alert.import')}
        </Button>
      );

      if (form) {
        exists.unshift(
          <Button startIcon={<Download />} onClick={() => onExport()}>
            {t('alert.export')}
          </Button>
        );
      }

      exists.unshift(<ToggleFullscreen />);

      return exists;
    },
    [form, formChanged, onExport, onImport, save, submitting, t]
  );

  return (
    <Root footerProps={{ className: 'dashboard-footer' }} headerAddons={headerAddons}>
      <Box
        component={PanelGroup}
        autoSaveId="ai-studio-template-layouts"
        direction="horizontal"
        sx={{ height: '100%' }}>
        <Box component={Panel} defaultSize={10} minSize={10}>
          <TemplateList
            sx={{ height: '100%', overflow: 'auto' }}
            className="list"
            current={current}
            onCreate={async (input) => {
              const res = await create({ name: '', ...input });
              to(res._id);
            }}
            onExport={onExport}
            onRemoveFolder={(folderId) => {
              const folderName = treeRef.current.find((i) => i.id === folderId)?.text;
              const templates = treeRef.current
                .filter(
                  (i): i is typeof i & { data: { type: 'template' } } =>
                    i.data?.type === 'template' && i.data.data.folderId === folderId
                )
                .map((i) => i.data?.data);

              showDialog({
                maxWidth: 'xs',
                fullWidth: true,
                title: t('alert.delete'),
                content: (
                  <>
                    <Box>{t('alert.deleteTemplates')}</Box>
                    <Box component="ul" sx={{ pl: 2 }}>
                      <Box component="li">
                        <Box>{folderName || folderId}</Box>

                        <Box component="ul">
                          {templates.map((template) => (
                            <Box key={template._id} component="li">
                              {template.name || template._id}
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
                    await removeFolder(folderId);
                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  }
                },
              });
            }}
            onDelete={(template) => {
              const referrers = templates.filter(
                (i) => i.type === 'branch' && i.branch?.branches.some((j) => j.template?.id === template._id)
              );

              showDialog({
                maxWidth: 'xs',
                fullWidth: true,
                title: t('alert.deleteTemplate', { template: template.name || template._id }),
                content: referrers.length ? (
                  <>
                    {t('alert.deleteTemplateContent', { references: referrers.length })}
                    <ul>
                      {referrers.map((template) => (
                        <Box key={template._id} component="li">
                          {template.name || template._id}
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
                    await remove(template._id);
                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  }
                },
              });
            }}
            onClick={(template) => to(template._id)}
            onLaunch={!assistant ? undefined : onLaunch}
          />
        </Box>
        <ResizeHandle />
        <Box component={Panel} minSize={30}>
          <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            {form && (
              <TemplateFormView
                value={form}
                onCommitSelect={async (commit) => {
                  if (!(await requireSave())) return;
                  try {
                    const template = await checkout(form._id, commit.oid);
                    setCurrent(template, true);
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                    throw error;
                  }
                }}
                onChange={setFormValue}
                onExecute={onExecute}
                onTemplateClick={({ id }) => {
                  const template = templates.find((i) => i._id === id);
                  if (template) to(template._id);
                }}
              />
            )}
          </Box>
        </Box>
        <ResizeHandle />
        <Box component={Panel} defaultSize={45} minSize={20}>
          <Conversation
            ref={ref}
            messages={messages}
            sx={{ height: '100%', overflow: 'auto' }}
            onSubmit={(prompt) => add(prompt)}
            customActions={customActions}
          />
        </Box>
      </Box>

      {dialog}
    </Root>
  );
}

function ToggleFullscreen() {
  const { inFullPage, toggleFullPage } = useFullPage();

  return <IconButton onClick={toggleFullPage}>{inFullPage ? <FullscreenExit /> : <Fullscreen />}</IconButton>;
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

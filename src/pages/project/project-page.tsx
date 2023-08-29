import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ConversationRef, ImageGenerationSize, MessageItem, useConversation } from '@blocklet/ai-kit';
import Header from '@blocklet/ui-react/lib/Header';
import {
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
  Button,
  CircularProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useAsyncEffect, useLocalStorageState } from 'ahooks';
import { uniqBy } from 'lodash';
import { ReactNode, forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useBeforeUnload, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { importBodySchema, importTemplates } from '../../libs/import';
import { Commit } from '../../libs/log';
import { getFile } from '../../libs/tree';
import useDialog from '../../utils/use-dialog';
import usePickFile, { readFileAsText } from '../../utils/use-pick-file';
import BranchButton from './branch-button';
import { useExportFiles } from './export-files';
import { TreeNode } from './file-tree';
import MenuButton from './menu-button';
import SaveButton from './save-button';
import { FormState, defaultBranch, useFormState, useProjectState } from './state';
import TemplateRunner from './template-runner';
import TemplateToolbar from './template-toolbar';
import { useSaveShortcut } from './utils';

// const submit = () => {
//   const getValueSchema = (parameter: Parameter) => {
//     return {
//       string: (parameter: StringParameter) => {
//         let s = Joi.string();
//         if (parameter.required) {
//           s = s.required();
//         } else {
//           s = s.allow('');
//         }
//         if (typeof parameter.minLength === 'number') {
//           s = s.min(parameter.minLength);
//         }
//         if (typeof parameter.maxLength === 'number') {
//           s = s.max(parameter.maxLength);
//         }
//         return s;
//       },
//       number: (parameter: NumberParameter) => {
//         let s = Joi.number();
//         if (parameter.required) {
//           s = s.required();
//         }
//         if (typeof parameter.min === 'number') {
//           s = s.min(parameter.min);
//         }
//         if (typeof parameter.max === 'number') {
//           s = s.max(parameter.max);
//         }
//         return s;
//       },
//       select: (parameter: SelectParameter) => {
//         let s = Joi.string();
//         if (parameter.required) {
//           s = s.required();
//         }
//         return s;
//       },
//       language: (parameter: LanguageParameter) => {
//         let s = Joi.string();
//         if (parameter.required) {
//           s = s.required();
//         }
//         return s;
//       },
//       horoscope: (parameter: HoroscopeParameter) => {
//         let s = Joi.object({
//           time: Joi.string().required(),
//           offset: Joi.number().integer(),
//           location: Joi.object({
//             id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
//             latitude: Joi.number().required(),
//             longitude: Joi.number().required(),
//             name: Joi.string().required(),
//           }).required(),
//         });
//         if (parameter.required) {
//           s = s.required();
//         }
//         return s;
//       },
//     }[parameter.type || 'string'](parameter as any);
//   };

//   const params = form.prompts?.flatMap((i) => matchParams(i.content ?? '')) ?? [];

//   const schema = Joi.object(
//     Object.fromEntries(
//       params.map((param) => {
//         const parameter = form.parameters?.[param];
//         return [param, parameter ? getValueSchema(parameter) : undefined];
//       })
//     )
//   );

//   setError(undefined);
//   const { error, value } = schema.validate(
//     Object.fromEntries(
//       Object.entries(form.parameters ?? {}).map(([key, { value, defaultValue }]) => [key, value ?? defaultValue])
//     ),
//     { allowUnknown: true, abortEarly: false }
//   );
//   if (error) {
//     setError(error);
//     return;
//   }
//   onExecute?.(
//     JSON.parse(
//       JSON.stringify({
//         ...form,
//         parameters: Object.fromEntries(
//           Object.entries(form.parameters ?? {}).map(([param, parameter]) => [
//             param,
//             { ...parameter, value: value[param] },
//           ])
//         ),
//       })
//     )
//   );
// };

const PREVIOUS_FILE_PATH = (projectId: string) => `ai-studio.previousFilePath.${projectId}`;

export default function ProjectPage() {
  const { projectId, ref, '*': filepath } = useParams();
  if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

  const {
    state: { files, branches, commits, loading },
    refetch,
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

  // const onExecute = async (template: Template) => {
  //   const { parameters } = template;
  //   const question = parameters?.question?.value;

  //   add(question?.toString() || '', { template, path: filepath });
  // };

  const assistant = useComponent('ai-assistant');

  const onTemplateClick = useCallback(
    async (_: Template, p: string[]) => {
      if (!disableMutation && editor.current && !(await editor.current.requireSave())) return;
      const to = p.join('/');
      if (to !== filepath) navigate(to);
    },
    [disableMutation, filepath, navigate]
  );

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

  const theme = useTheme();

  const formState = useFormState();

  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const addons = ([...addons]: ReactNode[]) => {
    addons.unshift(
      <BranchButton />,

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
      </CommitsTip>,

      <SaveButton
        disabled={disableMutation || (branches.includes(ref) && !formState.current.formChanged)}
        loading={formState.current.saving}
        changed={formState.current.formChanged}
        onSave={editor.current?.save}
      />,

      <MenuButton
        menus={[
          {
            icon: <Upload />,
            title: t('alert.import'),
            disabled: !branches.includes(ref) || disableMutation,
            onClick: () => onImport(),
          },
          {
            icon: <Download />,
            title: t('alert.export'),
            onClick: () => onExport(),
          },
        ]}
      />
    );

    return addons;
  };

  const child = (
    <Box height="100%" overflow="auto" pb={10}>
      <Box ml={{ xs: 2, sm: 3 }} mr={2}>
        {branches.length > 0 && !branches.includes(ref) && (
          <Box sx={{ position: 'sticky', zIndex: 10, top: 0, mb: 2, bgcolor: 'background.paper' }}>
            <Alert color="warning">{t('alert.onBranchTip')}</Alert>
          </Box>
        )}

        {filepath && (
          <TemplateEditor projectId={projectId} ref={editor} _ref={ref} path={filepath} formState={formState} />
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {dialog}
      {exporter}

      <Header
        maxWidth="none"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '.header-addons > *': { ml: 1 },
        }}
        addons={addons}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: 0,
          top: 64,
          right: 0,
          bottom: 0,
        }}>
        <TemplateToolbar
          projectId={projectId}
          formState={formState}
          TemplateListProps={{
            projectId,
            _ref: ref,
            filepath,
            disableMutation,
            onImport,
            onExport,
            onLaunch,
            onClick: onTemplateClick,
          }}
        />

        {isSmallScreen ? (
          child
        ) : (
          <Box component={PanelGroup} autoSaveId="ai-studio-template-layouts" direction="horizontal" sx={{ flex: 1 }}>
            <Box component={Panel} minSize={30}>
              {child}
            </Box>

            <ResizeHandle />

            <Box component={Panel} defaultSize={45} minSize={20}>
              <Box height="100%" overflow="auto">
                <Box mr={{ xs: 2, sm: 3 }} ml={2}>
                  {formState.current.form && <TemplateRunner template={formState.current.form} />}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}

interface TemplateEditorInstance {
  save: (options?: { newBranch?: boolean }) => Promise<void>;
  requireSave: () => Promise<boolean>;
  reload: () => Promise<Template>;
}

const TemplateEditor = forwardRef<
  TemplateEditorInstance,
  {
    formState: FormState;
    projectId: string;
    _ref: string;
    path: string;
  }
>(({ formState, projectId, _ref: ref, path }, _ref) => {
  const isAdmin = useIsAdmin();
  const disableMutation = ref === defaultBranch && !isAdmin;

  const { t } = useLocaleContext();

  const navigate = useNavigate();

  const { dialog, showDialog } = useDialog();
  const { dialog: createBranchDialog, showDialog: showCreateBranchDialog } = useDialog();

  const [error, setError] = useState<Error>();

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
      if (!newBranch && projectState.branches.includes(ref) && !formState.current.formChanged) return;

      try {
        formState.current.saving = true;
        const branch =
          !disableMutation && !newBranch && projectState.branches.includes(ref) ? ref : await showCreateBranch();
        if (!branch) return;

        if (formState.current.formChanged) {
          const res = await putFile({
            projectId,
            ref: branch,
            path,
            data: {
              ...formState.current.form,
              deleteEmptyTemplates: [...formState.current.deletedBranchTemplateIds],
            },
          });

          formState.current.resetForm(res);
          setHash(undefined);
        }
        Toast.success(t('alert.saved'));
        if (branch !== ref) navigate(joinUrl('..', branch, path));
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      } finally {
        formState.current.saving = false;
      }
    },
    [
      disableMutation,
      projectState.branches,
      ref,
      formState.current.formChanged,
      showCreateBranch,
      putFile,
      projectId,
      path,
      formState.current.form,
      formState.current.deletedBranchTemplateIds,
      t,
      navigate,
    ]
  );

  const requireSave = useCallback(async () => {
    if (!formState.current.formChanged) return true;

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
          formState.current.resetForm(formState.current.original);
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
  }, [projectState.branches, ref, save, showDialog, t]);

  const reload = useCallback(async () => {
    try {
      formState.current.resetForm();
      setError(undefined);
      const res = await getFile({ projectId, ref, path });
      formState.current.resetForm(res);
      return res;
    } catch (error) {
      setError(error);
      throw error;
    }
  }, [path, ref]);

  useAsyncEffect(async () => {
    reload();
  }, [reload]);

  useImperativeHandle(_ref, () => ({ save, requireSave, reload }), [requireSave, reload]);

  useSaveShortcut(save);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (formState.current.formChanged) e.returnValue = t('alert.discardChanges');
      },
      [formState.current.formChanged, t]
    )
  );

  const [hash, setHash] = useState<string>();

  const onCommitSelect = useCallback(
    async (commit: Commit) => {
      try {
        const res = await getFile({ projectId, ref: commit.oid, path });
        setHash(commit.oid);
        formState.current.setForm(res);
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

  if (!formState.current.form) {
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
        value={formState.current.form}
        onChange={formState.current.setForm}
        onCommitSelect={onCommitSelect}
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

function ResizeHandle() {
  return (
    <Stack
      component={PanelResizeHandle}
      alignSelf="center"
      alignItems="center"
      justifyContent="center"
      width={12}
      height={30}
      borderRadius={100}
      bgcolor="grey.200"
      sx={{
        opacity: 0.6,
        transition: 'all 0.3s ease-in-out',
        ':hover': { height: 100, opacity: 1 },
        '&[data-resize-handle-active="pointer"]': { height: 100, opacity: 1 },
      }}>
      <DragIndicator sx={{ fontSize: 14, touchAction: 'none' }} />
    </Stack>
  );
}

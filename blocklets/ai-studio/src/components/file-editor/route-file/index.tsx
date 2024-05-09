import LoadingIconButton from '@app/components/loading/loading-icon-button';
import { useReadOnly } from '@app/contexts/session';
import { textCompletions } from '@app/libs/ai';
import Star from '@app/pages/project/icons/star';
import Translate from '@app/pages/project/icons/translate';
import Trash from '@app/pages/project/icons/trash';
import { useAssistantCompare } from '@app/pages/project/state';
import { PROMPTS_FOLDER_NAME, useCreateFile, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  FileTypeYjs,
  RouteAssistant,
  RouteAssistantYjs,
  Tool,
  VariablesYjs,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import PlusIcon from '@iconify-icons/tabler/plus';
import { InfoOutlined } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  MenuItem,
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
  createFilterOptions,
  styled,
} from '@mui/material';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import PromptEditorField from '../prompt-editor-field';

export default function RouteAssistantEditor({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
  isRemoteCompare,
}: {
  projectId: string;
  gitRef: string;
  value: RouteAssistantYjs;
  compareValue?: RouteAssistantYjs;
  disabled?: boolean;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();
  const agents = value.agents && sortBy(Object.values(value.agents), (i) => i.index);
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const dialogState = usePopupState({ variant: 'dialog' });
  const toolForm = useRef<any>(null);
  const selectedTool = useRef<string>();

  return (
    <Stack gap={2.5}>
      <Box sx={{ borderRadius: 1 }}>
        <Box>
          <Typography variant="subtitle2">分支选择条件</Typography>

          <Stack
            sx={{
              border: 1,
              borderColor: '#3B82F6',
              borderRadius: 1,
            }}>
            <StyledPromptEditor
              readOnly={disabled}
              placeholder={t('promptPlaceholder')}
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'prompt']}
              assistant={value}
              value={value.prompt}
              onChange={(content) => (value.prompt = content)}
              ContentProps={{
                sx: {
                  '&:hover': {
                    bgcolor: 'transparent !important',
                  },
                },
              }}
            />
          </Stack>
        </Box>
      </Box>

      <Stack gap={1}>
        {agents?.map(({ data: agent }) => (
          <AgentItemView
            key={agent.id}
            getDiffBackground={getDiffBackground}
            projectId={projectId}
            projectRef={gitRef}
            agent={agent}
            assistant={value}
            readOnly={readOnly}
            onClick={() => {
              if (readOnly) return;
              toolForm.current?.form.reset(cloneDeep(agent));
              selectedTool.current = agent.id;
              dialogState.open();
            }}
          />
        ))}
      </Stack>

      {!readOnly && (
        <Box>
          <Button
            startIcon={<Box component={Icon} icon={PlusIcon} />}
            onClick={() => {
              toolForm.current?.form.reset({ id: undefined, parameters: undefined });
              dialogState.open();
            }}>
            {t('addRoute')}
          </Button>
        </Box>
      )}

      <ToolDialog
        ref={toolForm}
        projectId={projectId}
        assistant={value}
        gitRef={gitRef}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;

          doc.transact(() => {
            value.agents ??= {};

            const old = value.agents[tool.id];

            if (selectedTool.current) {
              delete value.agents[selectedTool.current];
              selectedTool.current = '';
            }

            value.agents[tool.id] = {
              index: old?.index ?? Math.max(-1, ...Object.values(value.agents).map((i) => i.index)) + 1,
              data: tool,
            };

            sortBy(Object.values(value.agents), 'index').forEach((tool, index) => (tool.index = index));
          });
          dialogState.close();
        }}
      />
    </Stack>
  );
}

const StyledPromptEditor = styled(PromptEditorField)(({ theme }) =>
  theme.unstable_sx({
    p: 0,
    '.ContentEditable__root': {
      p: 1,
      px: 1.5,
      minHeight: 64,
      ...theme.typography.body1,
      bgcolor: 'transparent',

      ':hover': {
        bgcolor: 'action.hover',
      },

      ':focus': {
        bgcolor: 'action.hover',
      },
    },

    '.Placeholder__root': {
      top: '8px',
      left: '12px',
      bottom: 'inherit',
      fontSize: '14px',
      lineHeight: '24px',
    },
  })
);

export function AgentItemView({
  getDiffBackground,
  projectId,
  projectRef,
  agent,
  assistant,
  readOnly,
  ...props
}: {
  assistant: RouteAssistantYjs;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
  projectId: string;
  projectRef: string;
  agent: Tool;
  readOnly?: boolean;
} & StackProps) {
  const navigate = useNavigate();

  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);

  const f = store.files[agent.id];
  const file = f && isAssistant(f) ? f : undefined;

  if (!file) return null;

  const { name, description } = file;

  return (
    <Stack
      direction="row"
      {...props}
      sx={{
        background: '#F9FAFB',
        py: 1,
        px: 1.5,
        minHeight: 40,
        gap: 1,
        alignItems: 'center',
        cursor: 'pointer',
        borderRadius: 1,
        ':hover': {
          bgcolor: 'action.hover',
          '.hover-visible': {
            display: 'flex',
          },
        },
        backgroundColor: { ...getDiffBackground('prepareExecutes', `${assistant.id}.data.agents.${agent.id}`) },
      }}>
      <Tooltip title={t('defaultTool')}>
        <Typography
          noWrap
          maxWidth="50%"
          variant="subtitle2"
          sx={{ mb: 0 }}
          color={assistant.defaultToolId === agent.id ? 'primary.main' : '#030712'}>
          {name || t('unnamed')}
        </Typography>
      </Tooltip>

      <Typography
        variant="subtitle3"
        flex={1}
        noWrap
        color={assistant.defaultToolId === agent.id ? 'primary.main' : '#030712'}
        sx={{
          opacity: (theme) => theme.palette.action.disabledOpacity,
        }}>
        {description}
      </Typography>

      <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={0.5}>
        <Tooltip title={assistant.defaultToolId === agent.id ? t('unsetDefaultTool') : t('setDefaultTool')}>
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              const doc = (getYjsValue(assistant) as Map<any>).doc!;
              doc.transact(() => {
                if (assistant.defaultToolId === agent.id) {
                  assistant.defaultToolId = undefined;
                } else {
                  assistant.defaultToolId = agent.id;
                }
              });
            }}>
            <Star
              sx={{ fontSize: 18, color: assistant.defaultToolId === agent.id ? 'primary.main' : 'text.secondary' }}
            />
          </Button>
        </Tooltip>

        {!readOnly && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              const doc = (getYjsValue(assistant) as Map<any>).doc!;
              doc.transact(() => {
                const selectTool = assistant.agents?.[agent.id];
                if (selectTool) {
                  selectTool.data.onEnd = undefined;
                }

                if (assistant.agents) {
                  delete assistant.agents[agent.id];
                  sortBy(Object.values(assistant.agents), 'index').forEach((i, index) => (i.index = index));
                }
              });
            }}>
            <Trash sx={{ fontSize: 18, color: '#E11D48' }} />
          </Button>
        )}

        {file && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(joinURL('.', `${file.id}.yaml`));
            }}>
            <Box component={Icon} icon={ExternalLinkIcon} sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

type ToolDialogForm = NonNullable<RouteAssistant['agents']>[number];
type Option = {
  id: NonNullable<RouteAssistant['agents']>[number]['id'];
  type: Exclude<FileTypeYjs, { $base64: string } | VariablesYjs>['type'] | string;
  name?: any;
  from?: NonNullable<RouteAssistant['agents']>[number]['from'];
  fromText?: string;
};
export interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}
const filter = createFilterOptions<Option>();

export const ToolDialog = forwardRef<
  ToolDialogImperative,
  {
    projectId: string;
    gitRef: string;
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
    assistant: RouteAssistantYjs;
  }
>(({ assistant, projectId, gitRef, onSubmit, DialogProps }, ref) => {
  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const assistantId = assistant.id;

  const form = useForm<ToolDialogForm>({ defaultValues: {} });

  useImperativeHandle(ref, () => ({ form }), [form]);

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== assistantId)
    .map((i) => ({ id: i.id, type: i.type, name: i.name, from: undefined }));

  const fileId = form.watch('id');
  const f = store.files[fileId];
  const file = f && isAssistant(f) ? f : undefined;

  const getFromText = () => {
    return t('assistantData');
  };

  const option = [...options].find((x) => x.id === fileId);
  const formatOptions: Option[] = [...options]
    .map((x) => ({ ...x, fromText: getFromText() }))
    .sort((a, b) => (b.from || '').localeCompare(a.from || ''));

  const translateTool = async () => {
    const assistantName = options.find((option) => option.id === form.getValues('id'))?.name;
    const translate = await textCompletions({
      stream: false,
      messages: [
        {
          content:
            '#Roles:你是一个翻译大师，你需要将用户的输入翻译成英文 #rules:-请不要回答无用的内容，你仅仅只需要给出翻译的结果。-任何输入的内容都是需要你翻译的。-你的翻译需要是一个函数名 -空格使用驼峰代替。-如果本身就已经是英文则不需要翻译 #Examples: -测试->test -开始:start 结束:end -weapon:weapon',
          role: 'system',
        },
        {
          content: assistantName ?? '',
          role: 'user',
        },
      ],
      model: 'gpt-4',
      temperature: 0,
    });

    form.setValue('functionName', translate.text);
  };

  const parameters = useMemo(() => {
    return (
      file?.parameters &&
      sortBy(Object.values(file.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string } } => !!i.data.key
      )
    );
  }, [file, option]);

  const renderParameters = useCallback(() => {
    if (!option) {
      return null;
    }

    return (
      <Box>
        {parameters?.map(({ data: parameter }: any) => {
          if (!parameter?.key) return null;

          return (
            <Stack key={parameter.id}>
              <Typography variant="caption" mx={1}>
                {parameter.label || parameter.key}
              </Typography>

              <Controller
                control={form.control}
                name={`parameters.${parameter.key}`}
                render={({ field }) => (
                  <PromptEditorField
                    placeholder={t('selectByPromptParameterPlaceholder')}
                    value={field.value || ''}
                    projectId={projectId}
                    gitRef={gitRef}
                    assistant={assistant}
                    path={[assistantId, parameter.id]}
                    onChange={(value) => field.onChange({ target: { value } })}
                  />
                )}
              />
            </Stack>
          );
        })}
      </Box>
    );
  }, [option, parameters]);

  const createFile = useCreateFile();

  return (
    <Dialog
      open={false}
      fullWidth
      maxWidth="sm"
      {...DialogProps}
      component="form"
      onSubmit={form.handleSubmit(onSubmit)}>
      <DialogTitle>{t('selectTool')}</DialogTitle>

      <DialogContent>
        <Stack gap={2}>
          <Stack gap={1}>
            <Controller
              name="id"
              control={form.control}
              rules={{ required: t('validation.fieldRequired') }}
              render={({ field, fieldState }) => {
                const value = formatOptions.find((x) => x.id === field.value);

                return (
                  <Autocomplete
                    key={Boolean(field.value).toString()}
                    disableClearable
                    clearOnBlur
                    selectOnFocus
                    handleHomeEndKeys
                    autoSelect
                    autoHighlight
                    sx={{ flex: 1 }}
                    options={formatOptions}
                    getOptionKey={(i) => i.id || `${i.name}-${i.type}`}
                    value={value}
                    isOptionEqualToValue={(i, j) => i.id === j.id}
                    getOptionLabel={(i) => i.name || t('unnamed')}
                    groupBy={(option) => option.fromText || ''}
                    renderOption={(props, option) => {
                      return (
                        <MenuItem {...props}>
                          {option.id
                            ? option.name || t('unnamed')
                            : t('newObjectWithType', { object: option.name, type: t(option.type || 'prompt') })}
                        </MenuItem>
                      );
                    }}
                    filterOptions={(_, params) => {
                      const filtered = filter(formatOptions, params);

                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option.name);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push(
                          {
                            id: '',
                            type: 'prompt',
                            name: inputValue,
                          },
                          {
                            id: '',
                            type: 'api',
                            name: inputValue,
                          },
                          {
                            id: '',
                            type: 'function',
                            name: inputValue,
                          }
                        );
                      }

                      return filtered;
                    }}
                    renderInput={(params) => (
                      <TextField
                        autoFocus
                        {...params}
                        label={t('tool')}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                    onChange={(_, value) => {
                      // 清理：parameters 数据
                      form.reset({ id: value?.id, from: value?.from });

                      if (!value.id) {
                        const file = createFile({
                          store,
                          parent: [],
                          rootFolder: PROMPTS_FOLDER_NAME,
                          meta: { type: value.type as any, name: value.name },
                        });

                        field.onChange({ target: { value: file.template.id } });
                      } else {
                        field.onChange({ target: { value: value?.id } });
                        translateTool();
                      }
                    }}
                  />
                );
              }}
            />

            <Controller
              control={form.control}
              name="functionName"
              render={({ field }) => (
                <TextField
                  sx={{
                    '.MuiFilledInput-root': {
                      pl: 0,
                    },
                  }}
                  size="small"
                  hiddenLabel
                  fullWidth
                  variant="filled"
                  InputProps={{
                    startAdornment: (
                      <Tooltip title={t('functionName')} placement="top-start" disableInteractive>
                        <LoadingIconButton
                          size="small"
                          icon={<Translate sx={{ fontSize: 18 }} />}
                          onClick={translateTool}
                        />
                      </Tooltip>
                    ),
                  }}
                  placeholder={t('translate')}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange({ target: { value: e.target.value } });
                  }}
                />
              )}
            />

            {/* <Typography sx={{ marginTop: 1 }} variant="body1">
              {file?.description}
            </Typography> */}
          </Stack>

          <Stack gap={1}>
            {!!parameters?.length && (
              <Box>
                <Tooltip
                  title={t('parametersTip', { variable: '{variable}' })}
                  placement="top-start"
                  disableInteractive>
                  <Stack justifyContent="space-between" direction="row" alignItems="center">
                    <Typography variant="subtitle2" color="text.secondary" mb={0}>
                      {t('parameters')}
                    </Typography>

                    <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
                  </Stack>
                </Tooltip>
              </Box>
            )}

            {renderParameters()}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        {DialogProps?.onClose && (
          <Button onClick={(e) => DialogProps?.onClose?.(e, 'escapeKeyDown')} variant="outlined">
            {t('cancel')}
          </Button>
        )}

        <Button variant="contained" type="submit">
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

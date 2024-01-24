import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ExecuteBlock,
  ExecuteBlockYjs,
  FileTypeYjs,
  Role,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
  createFilterOptions,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAssistantCompare } from 'src/pages/project/state';
import { joinURL } from 'ufo';

import { getDatasetList } from '../../libs/dataset';
import Add from '../../pages/project/icons/add';
import External from '../../pages/project/icons/external';
import InfoOutlined from '../../pages/project/icons/question';
import Trash from '../../pages/project/icons/trash';
import { PROMPTS_FOLDER_NAME, useCreateFile, useProjectStore } from '../../pages/project/yjs-state';
import IndicatorTextField from '../awareness/indicator-text-field';
import PromptEditorField from './prompt-editor-field';

const FROM = 'dataset';

export default function ExecuteBlockForm({
  projectId,
  gitRef,
  assistant,
  value,
  readOnly,
  path,
  compareAssistant,
  isRemoteCompare,
  ...props
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  value: ExecuteBlockYjs;
  path: (string | number)[];
  readOnly?: boolean;
  compareAssistant?: AssistantYjs;
  isRemoteCompare?: boolean;
} & StackProps) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const navigate = useNavigate();
  const toolForm = useRef<ToolDialogImperative>(null);

  const { store } = useProjectStore(projectId, gitRef);
  const { getDiffBackground } = useAssistantCompare({
    value: assistant,
    compareValue: compareAssistant,
    readOnly,
    isRemoteCompare,
  });

  const { data } = useRequest(() => getDatasetList());
  const datasets = data?.list || [];

  const tools = value.tools && sortBy(Object.values(value.tools), (i) => i.index);

  return (
    <Stack {...props} sx={{ border: 2, borderColor: 'warning.main', borderRadius: 1, p: 1, gap: 1, ...props.sx }}>
      <Stack direction="row" gap={1} alignItems="center">
        <Typography variant="subtitle2">{t('executeBlock')}</Typography>
        <IndicatorTextField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, value.selectType ?? 'all']}
          TextFiledProps={{
            size: 'small',
            select: true,
            hiddenLabel: true,
            SelectProps: {
              autoWidth: true,
            },
            value: value.selectType || 'all',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              (value.selectType = e.target.value as any),
            children: [
              <MenuItem key="all" value="all">
                {t('all')}
              </MenuItem>,
              <MenuItem key="selectByPrompt" value="selectByPrompt">
                {t('selectPrompt')}
              </MenuItem>,
            ],
          }}
        />

        {assistant.type === 'prompt' && (
          <IndicatorTextField
            projectId={projectId}
            gitRef={gitRef}
            path={[value.id, value.role ?? 'system']}
            TextFiledProps={{
              size: 'small',
              select: true,
              hiddenLabel: true,
              SelectProps: {
                autoWidth: true,
              },
              value: value.role || 'system',
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                (value.role = e.target.value as Role),
              children: [
                <MenuItem key="system" value="system">
                  System
                </MenuItem>,
                <MenuItem key="user" value="user">
                  User
                </MenuItem>,
                <MenuItem key="user" value="assistant">
                  Assistant
                </MenuItem>,
                <MenuItem key="none" value="none">
                  None
                </MenuItem>,
              ],
            }}
          />
        )}

        <Box flex={1} />
      </Stack>

      {value.selectType === 'selectByPrompt' && (
        <Stack>
          <Typography variant="caption">{t('prompt')}</Typography>
          <PromptEditorField
            readOnly={readOnly}
            projectId={projectId}
            gitRef={gitRef}
            path={path.concat('selectByPrompt')}
            assistant={assistant}
            value={value.selectByPrompt}
            onChange={(prompt) => (value.selectByPrompt = prompt)}
          />
        </Stack>
      )}

      <Divider />

      <Stack gap={0.5}>
        {tools?.map(({ data: tool }) => {
          const f = store.files[tool.id];
          const file = f && isAssistant(f) ? f : undefined;
          if (!file) {
            const dataset = datasets.find((x) => x.id === tool.id);
            if (dataset) {
              return (
                <Stack
                  key={dataset.id}
                  direction="row"
                  sx={{
                    px: 1,
                    minHeight: 32,
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
                    backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.tools.${tool.id}`) },
                  }}
                  onClick={() => {
                    if (readOnly) return;
                    toolForm.current?.form.reset(cloneDeep(tool));
                    dialogState.open();
                  }}>
                  <Typography variant="subtitle2" noWrap maxWidth="50%">
                    {dataset.summary || t('unnamed')}
                  </Typography>

                  <Typography variant="body1" color="text.secondary" flex={1} noWrap>
                    {dataset.description}
                  </Typography>

                  {!readOnly && (
                    <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={1}>
                      <Button
                        sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const doc = (getYjsValue(value) as Map<any>).doc!;
                          doc.transact(() => {
                            if (value.tools) {
                              delete value.tools[tool.id];
                              sortBy(Object.values(value.tools), 'index').forEach((i, index) => (i.index = index));
                            }
                          });
                        }}>
                        <Trash sx={{ fontSize: 18 }} />
                      </Button>
                    </Stack>
                  )}
                </Stack>
              );
            }

            return null;
          }

          return (
            <Stack
              key={file.id}
              direction="row"
              sx={{
                px: 1,
                minHeight: 32,
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
                backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.tools.${tool.id}`) },
              }}
              onClick={() => {
                if (readOnly) return;
                toolForm.current?.form.reset(cloneDeep(tool));
                dialogState.open();
              }}>
              <Typography variant="subtitle2" noWrap maxWidth="50%">
                {file.name || t('unnamed')}
              </Typography>

              <Typography variant="body1" color="text.secondary" flex={1} noWrap>
                {file.description}
              </Typography>

              {!readOnly && (
                <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={1}>
                  <Button
                    sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const doc = (getYjsValue(value) as Map<any>).doc!;
                      doc.transact(() => {
                        if (value.tools) {
                          delete value.tools[tool.id];
                          sortBy(Object.values(value.tools), 'index').forEach((i, index) => (i.index = index));
                        }
                      });
                    }}>
                    <Trash sx={{ fontSize: 18 }} />
                  </Button>

                  <Button
                    sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(joinURL('.', `${file.id}.yaml`));
                    }}>
                    <External sx={{ fontSize: 18 }} />
                  </Button>
                </Stack>
              )}
            </Stack>
          );
        })}

        {!readOnly && (
          <Box>
            <Button
              startIcon={<Add />}
              onClick={() => {
                toolForm.current?.form.reset({ id: undefined, parameters: undefined });
                dialogState.open();
              }}>
              {t('addObject', { object: t('tool') })}
            </Button>
          </Box>
        )}
      </Stack>

      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
          {t('formatResult')}
        </Typography>

        <IndicatorTextField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, value.formatResultType ?? 'none']}
          TextFiledProps={{
            select: true,
            hiddenLabel: true,
            SelectProps: {
              autoWidth: true,
            },
            value: value.formatResultType || 'none',
            onChange: (e) => (value.formatResultType = e.target.value as any),
            children: [
              <MenuItem key="none" value="none">
                {t('stayAsIs')}
              </MenuItem>,
              <MenuItem key="asHistory" value="asHistory">
                {t('asHistory')}
              </MenuItem>,
            ],
          }}
        />

        <Box flex={1} />

        <Typography variant="body1" component="label">
          {t('variable')}
        </Typography>

        <IndicatorTextField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, value.variable ?? '']}
          TextFiledProps={{
            hiddenLabel: true,
            InputProps: {
              readOnly,
              sx: {
                backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.variable`) },
              },
            },
            value: value.variable ?? '',
            onChange: (e) => (value.variable = e.target.value),
          }}
        />
      </Stack>

      <ToolDialog
        executeBlock={value}
        ref={toolForm}
        projectId={projectId}
        assistant={assistant}
        gitRef={gitRef}
        datasets={datasets.map((x) => ({ ...x, from: FROM }))}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;
          doc.transact(() => {
            value.tools ??= {};

            const old = value.tools[tool.id];

            value.tools[tool.id] = {
              index: old?.index ?? Math.max(-1, ...Object.values(value.tools).map((i) => i.index)) + 1,
              data: tool,
            };

            sortBy(Object.values(value.tools), 'index').forEach((tool, index) => (tool.index = index));
          });
          dialogState.close();
        }}
      />
    </Stack>
  );
}

type Option = {
  id: NonNullable<ExecuteBlock['tools']>[number]['id'];
  type: Exclude<FileTypeYjs, { $base64: string }>['type'] | string;
  name?: any;
  from?: NonNullable<ExecuteBlock['tools']>[number]['from'];
  fromText?: string;
};

const filter = createFilterOptions<Option>();

function isDatasetObject(
  option: any
): option is DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] } {
  return option && option.from === FROM;
}

type ToolDialogForm = NonNullable<ExecuteBlock['tools']>[number];

interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}

export const ToolDialog = forwardRef<
  ToolDialogImperative,
  {
    executeBlock: ExecuteBlockYjs;
    projectId: string;
    gitRef: string;
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
    assistant: AssistantYjs;
    datasets: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  }
>(({ datasets, executeBlock, assistant, projectId, gitRef, onSubmit, DialogProps }, ref) => {
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

  const option = [...options, ...datasets].find((x) => x.id === fileId);
  const formatOptions: Option[] = [
    ...options,
    ...datasets.map((dataset) => ({
      id: dataset.id,
      type: dataset.type,
      name: dataset.summary || dataset.description || t('unnamed'),
      from: dataset.from,
    })),
  ]
    .map((x) => ({ ...x, fromText: x.from === FROM ? '内置数据' : '模板数据' }))
    .sort((a, b) => (b.from || '').localeCompare(a.from || ''));

  const assistantParameters = new Set([
    ...Object.values(assistant.parameters ?? {}).map((i) => i.data.key),
    ...(assistant.type === 'prompt'
      ? Object.values(assistant.prompts ?? {})
          .map((i) => (i.data.type === 'executeBlock' ? i.data.data.variable : undefined))
          .filter(Boolean)
      : []),
  ]);

  const parameters = useMemo(() => {
    if (isDatasetObject(option)) {
      return option?.parameters;
    }

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

    if (isDatasetObject(option)) {
      return (
        <Box>
          {(parameters || [])?.map((parameter: any) => {
            if (!parameter) return null;

            return (
              <Stack key={parameter.name}>
                <Typography variant="caption" mx={1}>
                  {parameter.description || parameter.name}
                </Typography>

                <Controller
                  control={form.control}
                  name={`parameters.${parameter.name}`}
                  render={({ field }) => (
                    <PromptEditorField
                      placeholder={`{{ ${parameter.name} }}`}
                      value={field.value || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={assistant}
                      path={[assistantId, parameter.name]}
                      onChange={(value) => field.onChange({ target: { value } })}
                    />
                  )}
                />
              </Stack>
            );
          })}
        </Box>
      );
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
                    placeholder={
                      executeBlock.selectType === 'selectByPrompt'
                        ? t('selectByPromptParameterPlaceholder')
                        : assistantParameters.has(parameter.key)
                        ? `{{ ${parameter.key} }}`
                        : undefined
                    }
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
  }, [option, parameters, assistantParameters]);

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

                    if (value.from === FROM) {
                      field.onChange({ target: { value: value?.id } });
                      return;
                    }

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
                    }
                  }}
                />
              );
            }}
          />

          <Typography variant="body1">{file?.description}</Typography>

          {parameters && parameters.length > 0 && (
            <Box>
              <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
                <Stack gap={0.5} direction="row" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('parameters')}
                  </Typography>

                  <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
                </Stack>
              </Tooltip>
            </Box>
          )}

          {renderParameters()}
        </Stack>
      </DialogContent>

      <DialogActions>
        {DialogProps?.onClose && (
          <Button onClick={(e) => DialogProps?.onClose?.(e, 'escapeKeyDown')}>{t('cancel')}</Button>
        )}

        <Button variant="contained" type="submit">
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

import { isValidInput } from '@app/libs/util';
import { PROMPTS_FOLDER_NAME, useCreateFile, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  ConfigFileYjs,
  CronFileYjs,
  ExecuteBlock,
  FileTypeYjs,
  MemoryFileYjs,
  ParameterYjs,
  ProjectSettings,
  RouterAssistant,
  RouterAssistantYjs,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import getOpenApiTextFromI18n from '@blocklet/dataset-sdk/util/get-open-api-i18n-text';
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
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  createFilterOptions,
  styled,
} from '@mui/material';
import { sortBy } from 'lodash';
import { useImperativeHandle, useMemo } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';

import PromptEditorField from '../prompt-editor-field';

export const FROM_API = 'blockletAPI';
export type RouteOption = { id: string; type: string; name?: string; from?: 'blockletAPI' };

type ToolDialogForm = NonNullable<RouterAssistant['routes']>[number];
type Option = {
  id: NonNullable<RouterAssistant['routes']>[number]['id'];
  type:
    | Exclude<FileTypeYjs, { $base64: string } | MemoryFileYjs | ProjectSettings | ConfigFileYjs | CronFileYjs>['type']
    | string;
  name?: any;
  from?: NonNullable<RouterAssistant['routes']>[number]['from'];
  fromText?: string;
};
interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}
const filter = createFilterOptions<Option>();

const ToolDialog = (
  {
    ref,
    assistant,
    projectId,
    gitRef,
    onSubmit,
    DialogProps,
    openApis
  }: {
    projectId: string;
    gitRef: string;
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
    assistant: RouterAssistantYjs;
    openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  } & {
    ref: React.RefObject<ToolDialogImperative | null>;
  }
) => {
  const { t, locale } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const assistantId = assistant.id;

  const form = useForm<ToolDialogForm>({ defaultValues: {} });

  useImperativeHandle(ref, () => ({ form }), [form]);
  const createFile = useCreateFile();

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== assistantId)
    .map((i) => ({ id: i.id, type: i.type, name: i.name, from: undefined }));

  const formatOptions: Option[] = [
    ...options,
    ...openApis.map((dataset) => ({
      id: dataset.id,
      type: dataset.type,
      name:
        getOpenApiTextFromI18n(dataset, 'summary', locale) ||
        getOpenApiTextFromI18n(dataset, 'description', locale) ||
        t('unnamed'),
      from: dataset.from,
    })),
  ]
    .map((x) => ({ ...x, fromText: x.from === FROM_API ? t('buildInData') : t('agent') }))
    .sort((a, b) => (b.from || '').localeCompare(a.from || ''));

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
                        label={t('agent')}
                        error={Boolean(fieldState.error)}
                        helperText={fieldState.error?.message}
                      />
                    )}
                    onChange={(_, value) => {
                      // 清理：parameters 数据
                      form.reset({ id: value?.id, from: value?.from });

                      if (value.from === FROM_API) {
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

                        field.onChange({ target: { value: file.file.id } });
                      } else {
                        field.onChange({ target: { value: value?.id } });
                      }
                    }}
                  />
                );
              }}
            />
          </Stack>

          <AgentParameters
            openApis={openApis}
            projectId={projectId}
            gitRef={gitRef}
            assistant={assistant}
            form={form}
          />
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
};

export const useFormatOpenApiToYjs = (openApis: DatasetObject[]) => {
  const { t, locale } = useLocaleContext();
  return openApis.map((api) => ({
    ...api,
    name:
      getOpenApiTextFromI18n(api, 'summary', locale) ||
      getOpenApiTextFromI18n(api, 'description', locale) ||
      t('unnamed'),
    description: getOpenApiTextFromI18n(api, 'description', locale),
    parameters: Object.fromEntries(
      getAllParameters(api).map(({ name, description, ...value }, index) => [
        index,
        { index, data: { ...value, key: name, label: description || name } },
      ])
    ),
  }));
};

const AgentParameters = ({
  projectId,
  gitRef,
  assistant,
  openApis,
  form,
  placeholder,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  openApis: DatasetObject[];
  form: UseFormReturn<ToolDialogForm>;
  placeholder?: string;
}) => {
  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const formattedOpenApis = useFormatOpenApiToYjs(openApis || []);
  const assistantId = assistant.id;

  const fileId = form.watch('id');
  const f = store.files[fileId];
  const file = f && isAssistant(f) ? f : undefined;
  const target = file ?? formattedOpenApis.find((x) => x.id === fileId);

  const parameters = useMemo(() => {
    return (target?.parameters &&
      sortBy(Object.values(target.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string; hidden?: boolean } } => !!i.data.key && !i.data.hidden
      )) as {
      index: number;
      data: ParameterYjs;
    }[];
  }, [target]);

  return (
    <Stack gap={1}>
      {!!parameters?.length && (
        <Box>
          <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
            <Stack justifyContent="space-between" direction="row" alignItems="center">
              <Typography variant="subtitle2" color="text.secondary" mb={0}>
                {t('parameters')}
              </Typography>

              <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
            </Stack>
          </Tooltip>
        </Box>
      )}

      {parameters?.map(({ data: parameter }: any) => {
        if (!parameter?.key) return null;
        if (!file && !isValidInput(parameter)) return null;

        if (parameter['x-parameter-type'] === 'boolean') {
          return (
            <Stack key={parameter.id}>
              <Controller
                control={form.control}
                name={`parameters.${parameter.key}`}
                render={({ field }) => {
                  return (
                    <FormControlLabel
                      sx={{
                        alignItems: 'flex-start',
                        '.MuiCheckbox-root': {
                          ml: -0.5,
                        },
                      }}
                      control={
                        <Switch
                          defaultChecked={Boolean(field.value ?? false)}
                          onChange={(_, checked) => {
                            field.onChange({ target: { value: checked } });
                          }}
                        />
                      }
                      label={<Typography variant="caption">{parameter.label || parameter.name}</Typography>}
                      labelPlacement="top"
                    />
                  );
                }}
              />
            </Stack>
          );
        }

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
                  placeholder={placeholder ?? t('selectByPromptParameterPlaceholder')}
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
    </Stack>
  );
};

export default ToolDialog;

export const StyledPromptEditor = styled(PromptEditorField)(({ theme }) =>
  theme.unstable_sx({
    p: 0,
    '.ContentEditable__root': {
      p: 1,
      px: 1.5,
      minHeight: 40,
      ...theme.typography.body1,
      bgcolor: '#fff',

      ':hover': {
        bgcolor: '#fff',
      },

      ':focus': {
        bgcolor: '#fff',
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

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
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
  Typography,
  createFilterOptions,
} from '@mui/material';
import {
  ApiFileYjs,
  ExecuteBlock,
  ExecuteBlockYjs,
  FileTypeYjs,
  FunctionFileYjs,
  PromptFileYjs,
} from 'api/src/store/projects';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import Add from 'src/pages/project/icons/add';
import Trash from 'src/pages/project/icons/trash';
import {
  PROMPTS_FOLDER_NAME,
  createFile,
  isApiFileYjs,
  isFunctionFileYjs,
  isPromptFileYjs,
  useProjectStore,
} from 'src/pages/project/yjs-state';

import PromptEditorField from './prompt-editor-field';

export default function ExecuteBlockForm({
  projectId,
  gitRef,
  value,
  readOnly,
  ...props
}: {
  projectId: string;
  gitRef: string;
  value: ExecuteBlockYjs;
  readOnly?: boolean;
} & StackProps) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });

  const toolForm = useRef<ToolDialogImperative>(null);

  const { store } = useProjectStore(projectId, gitRef);

  const tools = value.tools && sortBy(Object.values(value.tools), (i) => i.index);

  return (
    <Stack {...props} sx={{ border: 2, borderColor: 'warning.main', borderRadius: 1, p: 1, gap: 1, ...props.sx }}>
      <Stack direction="row" gap={1} alignItems="center">
        <Typography variant="subtitle2">Execute</Typography>

        <TextField
          size="small"
          select
          hiddenLabel
          SelectProps={{ autoWidth: true }}
          value={value.selectType || 'all'}
          onChange={(e) => (value.selectType = e.target.value as any)}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="selectByPrompt">Select by Prompt</MenuItem>
        </TextField>

        <Box flex={1} />
      </Stack>

      {value.selectType === 'selectByPrompt' && (
        <Stack>
          <Typography variant="caption">Prompt</Typography>

          <PromptEditorField value={value.selectByPrompt} onChange={(prompt) => (value.selectByPrompt = prompt)} />
        </Stack>
      )}

      <Stack gap={0.5}>
        <Typography variant="caption">Tools</Typography>

        {tools?.length ? (
          tools.map(({ data: tool }) => {
            const f = store.files[tool.id];
            const file = isPromptFileYjs(f) || isApiFileYjs(f) || isFunctionFileYjs(f) ? f : undefined;
            if (!file) return null;

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
                }}
                onClick={() => {
                  toolForm.current?.form.reset(cloneDeep(tool));
                  dialogState.open();
                }}>
                <Typography variant="subtitle2" noWrap maxWidth="50%">
                  {file.name || t('unnamed')}
                </Typography>

                <Typography variant="body1" color="text.secondary" flex={1} noWrap>
                  {file.description}
                </Typography>

                <Stack direction="row" className="hover-visible" sx={{ display: 'none' }}>
                  <Button
                    sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const doc = (getYjsValue(value) as Map<any>).doc!;
                      doc.transact(() => {
                        if (value.tools) {
                          delete value.tools[tool.id];
                          Object.values(value.tools).forEach((i, index) => (i.index = index));
                        }
                      });
                    }}>
                    <Trash sx={{ fontSize: 18 }} />
                  </Button>
                </Stack>
              </Stack>
            );
          })
        ) : (
          <Box textAlign="center">
            <Typography variant="caption" color="text.disabled">
              You haven't added any tools yet.
            </Typography>
          </Box>
        )}

        <Box>
          <Button
            startIcon={<Add />}
            onClick={() => {
              toolForm.current?.form.reset({ id: undefined, parameters: undefined });
              dialogState.open();
            }}>
            Add Tool
          </Button>
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
          Format Output
        </Typography>

        <TextField
          hiddenLabel
          select
          SelectProps={{ autoWidth: true }}
          value={value.formatResultType || 'none'}
          onChange={(e) => (value.formatResultType = e.target.value as any)}>
          <MenuItem value="none">Output as it is</MenuItem>
          <MenuItem value="asContext">Use as context</MenuItem>
        </TextField>

        <Box flex={1} />

        <Typography variant="body1" component="label">
          Variable
        </Typography>
        <TextField hiddenLabel value={value.variable || ''} onChange={(e) => (value.variable = e.target.value)} />
      </Stack>

      <ToolDialog
        ref={toolForm}
        projectId={projectId}
        gitRef={gitRef}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;
          doc.transact(() => {
            value.tools ??= {};
            value.tools[tool.id] = {
              index: Math.max(-1, ...Object.values(value.tools).map((i) => i.index)) + 1,
              data: tool,
            };
          });
          dialogState.close();
        }}
      />
    </Stack>
  );
}

const filter = createFilterOptions<{
  id: string;
  type: Exclude<FileTypeYjs, { $base64: string }>['type'];
  name: string | undefined;
}>();

type ToolDialogForm = NonNullable<ExecuteBlock['tools']>[number];

interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}

const ToolDialog = forwardRef<
  ToolDialogImperative,
  {
    projectId: string;
    gitRef: string;
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
  }
>(({ projectId, gitRef, onSubmit, DialogProps }, ref) => {
  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);

  const form = useForm<ToolDialogForm>({ defaultValues: {} });

  useImperativeHandle(ref, () => ({ form }), [form]);

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter(
      (i): i is PromptFileYjs | ApiFileYjs | FunctionFileYjs =>
        isPromptFileYjs(i) || isApiFileYjs(i) || isFunctionFileYjs(i)
    )
    .map((i) => ({ id: i.id, type: i.type, name: i.name }));

  const fileId = form.watch('id');
  const f = store.files[fileId];
  const file = isPromptFileYjs(f) || isApiFileYjs(f) || isFunctionFileYjs(f) ? f : undefined;
  const parameters = file?.parameters && sortBy(Object.values(file.parameters), (i) => i.index);

  return (
    <Dialog
      open={false}
      fullWidth
      maxWidth="sm"
      {...DialogProps}
      component="form"
      onSubmit={form.handleSubmit(onSubmit)}>
      <DialogTitle>Select Tool</DialogTitle>

      <DialogContent>
        <Stack gap={2}>
          <Controller
            name="id"
            control={form.control}
            rules={{ required: t('validation.fieldRequired') }}
            render={({ field, fieldState }) => {
              const file = store.files[field.value];
              const target = isPromptFileYjs(file) || isApiFileYjs(file) || isFunctionFileYjs(file) ? file : undefined;
              const value = target ? { id: target.id, type: target.type, name: target.name } : undefined;

              return (
                <Autocomplete
                  key={Boolean(field.value).toString()}
                  disableClearable
                  clearOnBlur
                  selectOnFocus
                  handleHomeEndKeys
                  autoSelect
                  autoHighlight
                  options={options}
                  getOptionKey={(i) => i.id || `${i.name}-${i.type}`}
                  value={value}
                  isOptionEqualToValue={(i, j) => i.id === j.id}
                  getOptionLabel={(i) => i.name || t('unnamed')}
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
                    const filtered = filter(options, params);

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
                      label="Tool"
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  )}
                  onChange={(_, value) => {
                    if (!value.id) {
                      const file = createFile({
                        store,
                        parent: [],
                        rootFolder: PROMPTS_FOLDER_NAME,
                        meta: { type: value.type, name: value.name },
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

          <Typography variant="subtitle2" mb={-1} ml={1} color="text.secondary">
            Parameters
          </Typography>
          {parameters?.map(({ data: parameter }) => {
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
                      value={field.value || ''}
                      onChange={(value) => field.onChange({ target: { value } })}
                    />
                  )}
                />
              </Stack>
            );
          })}
        </Stack>
      </DialogContent>

      <DialogActions>
        {DialogProps?.onClose && <Button onClick={(e) => DialogProps?.onClose?.(e, 'escapeKeyDown')}>Cancel</Button>}

        <Button variant="contained" type="submit">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
});

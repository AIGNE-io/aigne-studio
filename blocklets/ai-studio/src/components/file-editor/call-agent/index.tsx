import { useReadOnly } from '@app/contexts/session';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, CallAssistantYjs, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PlusIcon from '@iconify-icons/tabler/plus';
import Trash from '@iconify-icons/tabler/trash';
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
  Stack,
  StackProps,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { cloneDeep, sortBy } from 'lodash';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';

export default function CallAgentEditor({
  projectId,
  gitRef,
  value,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  value: CallAssistantYjs;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  const ref = useRef(null);
  const toolForm = useRef<any>(null);
  const dialogState = usePopupState({ variant: 'dialog' });
  const { addParameter } = useVariablesEditorOptions(value);
  const { store } = useProjectStore(projectId, gitRef);
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;

  return (
    <>
      <Stack gap={1} width={1} ref={ref}>
        <Stack gap={1}>
          {value.call ? (
            <Box key={value.call.id} display="flex" alignItems="center" gap={0.5} width={1}>
              <AgentItemView
                projectId={projectId}
                projectRef={gitRef}
                agent={value.call}
                assistant={value}
                readOnly={readOnly}
                onEdit={() => {
                  if (readOnly) return;
                  toolForm.current?.form.reset(cloneDeep(value.call));
                  dialogState.open();
                }}
              />
            </Box>
          ) : null}
        </Stack>

        <Box display="flex" sx={{ ml: -0.5 }}>
          <Button
            disabled={disabled || Boolean(value.call)}
            startIcon={<Box component={Icon} icon={PlusIcon} sx={{ fontSize: 16 }} />}
            onClick={() => {
              toolForm.current?.form.reset();
              dialogState.open();
            }}>
            {t('addMoreAgentTools')}
          </Button>
        </Box>
      </Stack>

      <ToolDialog
        ref={toolForm}
        projectId={projectId}
        assistant={value}
        gitRef={gitRef}
        DialogProps={{ ...bindDialog(dialogState) }}
        onSubmit={(tool) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;
          doc.transact(() => {
            value.call = tool;

            // 处理：input 数据
            const parameters = tool.parameters || {};
            const filterNilParameters = Object.entries(parameters).filter(([, value]) => !value);
            if (filterNilParameters.length) {
              filterNilParameters.forEach(([key]) => addParameter(key));
            }

            // 处理：output 数据
            const f = store.files[tool.id];
            const file = f && isAssistant(f) ? f : undefined;
            Object.entries(cloneDeep(file?.outputVariables || {})).forEach(([key, val]) => {
              const list = Object.entries(cloneDeep(value?.outputVariables || {}));
              const found = list.find(([, v]) => {
                return v?.data?.name === val?.data?.name;
              });

              if (!found) {
                value.outputVariables ??= {};
                value.outputVariables[key] = val;
              }
            });

            sortBy(Object.values(value?.outputVariables || {}), 'index').forEach((tool, index) => (tool.index = index));
          });

          dialogState.close();
        }}
      />
    </>
  );
}

type ToolDialogForm = NonNullable<CallAssistantYjs['call']>;
export interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}
export const ToolDialog = forwardRef<
  ToolDialogImperative,
  {
    projectId: string;
    gitRef: string;
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
    assistant: CallAssistantYjs;
  }
>(({ assistant, projectId, gitRef, onSubmit, DialogProps }, ref) => {
  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, gitRef);
  const assistantId = assistant.id;

  const form = useForm<ToolDialogForm>({ defaultValues: {} });

  useImperativeHandle(ref, () => ({ form }), [form]);

  const fileId = form.watch('id');
  const f = store.files[fileId];
  const file = f && isAssistant(f) ? f : undefined;

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== assistantId)
    .map((i) => ({ id: i.id, type: i.type, name: i.name, from: undefined }));

  const option = [...options].find((x) => x.id === fileId);

  const parameters = useMemo(() => {
    return (
      file?.parameters &&
      sortBy(Object.values(file.parameters), (i) => i.index).filter(
        (i): i is typeof i & { data: { key: string } } => !!i.data.key
      )
    );
  }, [file, option]);

  const renderParameters = useCallback(() => {
    if (!option) return null;

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
                    placeholder={`{{${parameter.label || parameter.key}}}`}
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
                const value = options.find((x) => x.id === field.value);

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
                    options={options}
                    getOptionKey={(i) => i.id || `${i.name}-${i.type}`}
                    value={value}
                    isOptionEqualToValue={(i, j) => i.id === j.id}
                    getOptionLabel={(i) => i.name || t('unnamed')}
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
                      form.reset({ id: value?.id });
                      field.onChange({ target: { value: value?.id } });
                    }}
                  />
                );
              }}
            />
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

export function AgentItemView({
  projectId,
  projectRef,
  agent,
  assistant,
  readOnly,
  onEdit,
  ...props
}: {
  assistant: CallAssistantYjs;
  projectId: string;
  projectRef: string;
  agent: Tool;
  readOnly?: boolean;
  onEdit: () => void;
} & StackProps) {
  const navigate = useNavigate();

  const { t } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);

  const f = store.files[agent.id];
  const target = f && isAssistant(f) ? f : undefined;

  if (!target) return null;
  const { name } = target;

  return (
    <Stack
      width={1}
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
        border: '1px solid transparent',
        borderColor: 'primary.main',
        ':hover': {
          // bgcolor: 'action.hover',
          '.hover-visible': {
            display: 'flex',
          },
        },
      }}>
      <Stack width={1}>
        <TextField
          onClick={(e) => e.stopPropagation()}
          hiddenLabel
          placeholder={name || t('unnamed')}
          size="small"
          variant="standard"
          value={name || t('unnamed')}
          InputProps={{ readOnly: true }}
          sx={{
            mb: 0,
            lineHeight: '22px',
            fontWeight: 500,
            input: {
              fontSize: '12px',
              color: 'primary.main',
            },
          }}
        />

        <TextField
          onClick={(e) => e.stopPropagation()}
          hiddenLabel
          placeholder={agent.functionName || t('description')}
          size="small"
          variant="standard"
          value={agent.functionName}
          onChange={(e) => (agent.functionName = e.target.value)}
          sx={{
            lineHeight: '24px',
            input: { fontSize: '14px' },
          }}
          inputProps={{ readOnly: true }}
        />
      </Stack>

      <Stack direction="row" className="hover-visible" sx={{ display: 'none' }} gap={0.5} flex={1}>
        <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onEdit}>
          <Box component={Icon} icon={PencilIcon} sx={{ fontSize: 18, color: 'text.secondary' }} />
        </Button>

        {!readOnly && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              const doc = (getYjsValue(assistant) as Map<any>).doc!;
              doc.transact(() => {
                delete assistant.call;
              });
            }}>
            <Box component={Icon} icon={Trash} sx={{ fontSize: 18, color: '#E11D48' }} />
          </Button>
        )}

        {target && (
          <Button
            sx={{ minWidth: 24, minHeight: 24, p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(joinURL('.', `${target.id}.yaml`));
            }}>
            <Box component={Icon} icon={ExternalLinkIcon} sx={{ fontSize: 18 }} />
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

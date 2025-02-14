import { DragSortListYjs } from '@app/components/drag-sort-list';
import { useReadOnly } from '@app/contexts/session';
import { isValidInput } from '@app/libs/util';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, CallAssistantYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import GripVertical from '@iconify-icons/tabler/grip-vertical';
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
import { nanoid } from 'nanoid';
import { ForwardedRef, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import PromptEditorField from '../prompt-editor-field';
import useVariablesEditorOptions from '../use-variables-editor-options';

type ToolDialogForm = NonNullable<CallAssistantYjs['agents']>[number]['data'];

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
  const { getFileById } = useProjectStore(projectId, gitRef);

  const ref = useRef(null);
  const toolForm = useRef<ToolDialogImperative | null>(null);
  const selectedTool = useRef<ToolDialogForm | undefined>();
  const dialogState = usePopupState({ variant: 'dialog' });
  const readOnly = useReadOnly({ ref: gitRef }) || disabled;
  const agents = value.agents && sortBy(Object.values(value.agents), (i) => i.index);

  return (
    <>
      <Stack gap={1} width={1} ref={ref}>
        <DragSortListYjs
          sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
          disabled={readOnly}
          list={value.agents ?? {}}
          renderItem={(agent, index, params) => {
            const key = agent.instanceId || agent.id;
            const target = getFileById(agent.id);
            if (!target) return null;

            return (
              <AgentItemView
                ref={(ref) => {
                  params.drop(ref);
                  params.preview(ref);
                }}
                dragRef={params.drag}
                key={key}
                target={target}
                CallAssistantIndex={index}
                projectId={projectId}
                gitRef={gitRef}
                agent={agent}
                assistant={value}
                readOnly={readOnly}
                onEdit={() => {
                  if (readOnly) return;
                  const tool = cloneDeep(agent);
                  toolForm.current?.form.reset(tool);
                  selectedTool.current = tool;
                  dialogState.open();
                }}
              />
            );
          }}
        />

        <Box display="flex" sx={{ ml: -0.5 }}>
          <Button
            disabled={disabled}
            startIcon={<Box component={Icon} icon={PlusIcon} sx={{ fontSize: 16 }} />}
            onClick={() => {
              toolForm.current?.form.reset({ id: '' });
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
          const instanceId = `${tool.id}-${nanoid()}`;

          const getNextIndex = (agents: typeof value.agents) => {
            return Math.max(-1, ...Object.values(agents || {}).map((i) => i.index)) + 1;
          };

          doc.transact(() => {
            value.agents ??= {};

            const createAgent = (index: number, other?: { functionName?: string }) => ({
              index,
              data: { ...tool, instanceId, ...other },
            });

            if (selectedTool.current) {
              if (selectedTool.current.id === tool.id) return;

              const oldKey = selectedTool.current.instanceId || selectedTool.current.id;
              const oldAgent = value.agents[oldKey];

              value.agents[instanceId] = createAgent(oldAgent?.index ?? getNextIndex(value.agents));

              delete value.agents[oldKey];
            } else {
              const agent = getFileById(tool.id);
              let functionName = agent?.name;
              let index = 1;

              while (
                (agents || []).find(
                  (i) => i.data.functionName === functionName || getFileById(i.data.id)?.name === functionName
                )
              ) {
                functionName = `${agent?.name}(${index})`;
                index++;
              }

              value.agents[instanceId] = createAgent(getNextIndex(value.agents), { functionName });
            }

            sortBy(Object.values(value.agents), 'index').forEach((tool, index) => (tool.index = index));
          });

          selectedTool.current = undefined;
          dialogState.close();
        }}
      />
    </>
  );
}

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

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i))
    .filter((i) => i.id !== assistantId)
    .map((i) => ({ id: i.id, type: i.type, name: i.name, from: undefined }));

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

export const AgentItemView = forwardRef(
  (
    {
      projectId,
      gitRef,
      agent,
      assistant,
      readOnly,
      onEdit,
      target,
      CallAssistantIndex,
      dragRef,
      ...props
    }: {
      assistant: CallAssistantYjs;
      projectId: string;
      gitRef: string;
      agent: NonNullable<CallAssistantYjs['agents']>[string]['data'];
      readOnly?: boolean;
      onEdit: () => void;
      CallAssistantIndex?: number;
      target: AssistantYjs;
      dragRef?: (el: HTMLElement | null) => void;
    } & StackProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const navigate = useNavigate();

    const { t } = useLocaleContext();
    const { addParameter } = useVariablesEditorOptions(assistant);

    const parameters = useMemo(() => {
      return (
        target?.parameters &&
        sortBy(Object.values(target.parameters), (i) => i.index).filter(
          (i): i is typeof i & { data: { key: string; hidden?: boolean } } => !!i.data.key && !i.data.hidden
        )
      );
    }, [target]);

    const checkParametersInParameter = (key: string) => {
      const parameters =
        (assistant?.parameters &&
          sortBy(Object.values(assistant.parameters), (i) => i.index).filter((i) => !i.data.hidden)) ||
        [];
      return Boolean(parameters.find((i) => i.data.key === key));
    };

    const { name, description } = target;

    return (
      <Stack
        ref={ref}
        {...props}
        sx={{
          position: 'relative',
          background: '#F9FAFB',
          py: 1,
          px: 1.5,
          minHeight: 40,
          gap: 1,
          alignItems: 'center',
          borderRadius: 1,
          border: '1px solid transparent',
          borderColor: 'primary.main',
          cursor: 'pointer',
          '&:hover': {
            '.hover-visible': {
              display: 'flex',
            },
          },
        }}>
        <Box
          ref={dragRef}
          sx={{
            display: readOnly ? 'none' : 'block',
            position: 'absolute',
            left: -15,
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'move',
          }}>
          <Box component={Icon} icon={GripVertical} sx={{ color: '#9CA3AF', fontSize: 14 }} />
        </Box>

        <Stack width={1}>
          <TextField
            onClick={(e) => e.stopPropagation()}
            hiddenLabel
            placeholder={name || t('unnamed')}
            size="small"
            variant="standard"
            value={agent.functionName ?? (name || t('unnamed'))}
            onChange={(e) => (agent.functionName = e.target.value)}
            sx={{
              mb: 0,
              lineHeight: '20px',
              fontWeight: 500,
              input: {
                fontSize: '18px',
                color: 'primary.main',
              },
            }}
          />

          <TextField
            onClick={(e) => e.stopPropagation()}
            hiddenLabel
            placeholder={name || t('unnamed')}
            size="small"
            variant="standard"
            value={name || t('unnamed')}
            InputProps={{ readOnly: true }}
            sx={{
              lineHeight: '10px',
              input: { fontSize: '10px', color: 'text.disabled' },
            }}
          />

          <TextField
            onClick={(e) => e.stopPropagation()}
            hiddenLabel
            placeholder={description || t('description')}
            size="small"
            variant="standard"
            value={description}
            onChange={(e) => (agent.functionName = e.target.value)}
            sx={{
              lineHeight: '10px',
              input: { fontSize: '10px', color: 'text.disabled' },
            }}
            inputProps={{ readOnly: true }}
          />

          <Box>
            <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
              <Stack justifyContent="space-between" direction="row" alignItems="center">
                <Typography variant="subtitle5" color="text.secondary" mb={0}>
                  {t('parameters')}
                </Typography>

                <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
              </Stack>
            </Tooltip>

            <Stack gap={1}>
              {parameters?.map(({ data: parameter }) => {
                if (!parameter?.key) return null;
                if (!isValidInput(parameter)) return null;
                const className = `hover-visible-${parameter.key}`;

                return (
                  <Stack
                    key={parameter.id}
                    sx={{
                      ':hover': { [`.${className}`]: { display: 'flex' } },
                    }}>
                    <Stack flexDirection="row" alignItems="center" mb={0.5}>
                      <Typography variant="caption" mx={1}>
                        {parameter.label || parameter.key}
                      </Typography>

                      {agent.parameters?.[parameter.key] || checkParametersInParameter(parameter.key) ? null : (
                        <Tooltip title={!agent.parameters?.[parameter.key] ? t('addParameter') : undefined}>
                          <Box
                            className={className}
                            component={Icon}
                            icon={PlusIcon}
                            sx={{ fontSize: 12, cursor: 'pointer', color: 'primary.main', display: 'none' }}
                            onClick={() => {
                              agent.parameters ??= {};
                              agent.parameters[parameter.key] = `{{${parameter.key}}}`;
                              addParameter(parameter.key);
                            }}
                          />
                        </Tooltip>
                      )}
                    </Stack>

                    <PromptEditorField
                      CallAssistantIndex={CallAssistantIndex}
                      placeholder={`{{${parameter.label || parameter.key}}}`}
                      value={agent.parameters?.[parameter.key] || ''}
                      projectId={projectId}
                      gitRef={gitRef}
                      assistant={assistant}
                      path={[]}
                      onChange={(value) => {
                        agent.parameters ??= {};
                        if (parameter.key) agent.parameters[parameter.key] = value;
                      }}
                    />
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        </Stack>

        <Stack
          direction="row"
          className="hover-visible"
          sx={{ position: 'absolute', right: 10, top: 10, display: 'none' }}
          gap={0.5}
          flex={1}>
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
                  const key = agent.instanceId || agent.id;

                  if (assistant.agents?.[key]) {
                    delete assistant.agents[key];
                  }
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
);

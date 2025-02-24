import AgentSelect from '@app/components/agent-select';
import { isValidInput } from '@app/libs/util';
import { UseAgentItem, useAgents } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RouterAssistant, RouterAssistantYjs } from '@blocklet/ai-runtime/types';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import { DatasetObject } from '@blocklet/dataset-sdk/types';
import getOpenApiTextFromI18n from '@blocklet/dataset-sdk/util/get-open-api-i18n-text';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Stack,
  StackProps,
  Tooltip,
  Typography,
  styled,
} from '@mui/material';
import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, UseFormReturn, useForm } from 'react-hook-form';

import PromptEditorField from '../prompt-editor-field';

export const FROM_API = 'blockletAPI';
export type RouteOption = { id: string; type: string; name?: string; from?: 'blockletAPI' };

type ToolDialogForm = NonNullable<RouterAssistant['routes']>[number];

interface ToolDialogImperative {
  form: UseFormReturn<ToolDialogForm>;
}

const ToolDialog = forwardRef<
  ToolDialogImperative,
  {
    onSubmit: (value: ToolDialogForm) => any;
    DialogProps?: DialogProps;
    assistant: RouterAssistantYjs;
  }
>(({ assistant, onSubmit, DialogProps }, ref) => {
  const { t } = useLocaleContext();

  const form = useForm<ToolDialogForm>({ defaultValues: {} });

  useImperativeHandle(ref, () => ({ form }), [form]);

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
              render={({ field }) => {
                const { projectId, blockletDid } = form.getValues();

                return (
                  <AgentSelect
                    type="tool"
                    excludes={[assistant.id]}
                    autoFocus
                    disableClearable
                    value={field.value ? { id: field.value, projectId, blockletDid } : undefined}
                    onChange={(_, v) => {
                      if (v) {
                        form.setValue('blockletDid', v.blockletDid);
                        form.setValue('projectId', v.projectId);
                        field.onChange({ target: { value: v.id } });
                      }
                    }}
                  />
                );
              }}
            />
          </Stack>

          <AgentParameters form={form} />
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

const AgentParameters = ({ form }: { form: UseFormReturn<ToolDialogForm> }) => {
  const agentId = form.watch('id');

  const tool = useAgents({ type: 'tool' }).agentMap[agentId];
  if (!tool) return null;

  return <ToolItemInputOutputs tool={tool} />;
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

export function ToolItemInputOutputs({
  tool,
}: {
  tool: UseAgentItem;
} & StackProps) {
  const { t } = useLocaleContext();

  const parameters = useMemo(() => {
    return (
      tool.parameters?.filter(
        (i): i is typeof i & { key: string; hidden?: boolean } => !!i.key && !i.hidden && isValidInput(i)
      ) ?? []
    );
  }, [tool]);

  const outputs = useMemo(() => {
    return (
      tool.outputVariables?.filter((i): i is typeof i & { key: string; hidden?: boolean } => !!i.name && !i.hidden) ??
      []
    );
  }, [tool]);

  if (!tool) return <Box />;

  return (
    <Stack gap={1}>
      <Box>
        <Typography variant="subtitle5" color="text.secondary" mb={0}>
          {t('inputs')}
        </Typography>

        <Stack gap={1} direction="row">
          {parameters.map((parameter) => (
            <Tooltip key={parameter.id} title={parameter.placeholder}>
              <Chip label={parameter.key} size="small" variant="filled" />
            </Tooltip>
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle5" color="text.secondary" mb={0}>
          {t('outputs')}
        </Typography>

        <Stack gap={1} direction="row">
          {outputs.map((output) => (
            <Tooltip key={output.id} title={output.description}>
              <Chip label={output.name} size="small" variant="filled" sx={{ py: 0 }} />
            </Tooltip>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

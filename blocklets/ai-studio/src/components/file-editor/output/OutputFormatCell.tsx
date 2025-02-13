import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, VariableYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import BracketsContainIcon from '@iconify-icons/tabler/brackets-contain';
import CodePlusIcon from '@iconify-icons/tabler/code-plus';
import CursorTextIcon from '@iconify-icons/tabler/cursor-text';
import SquareNumberIcon from '@iconify-icons/tabler/square-number-1';
import ToggleLeftIcon from '@iconify-icons/tabler/toggle-left';
import { Box, ListItemIcon, MenuItem, TextField, TextFieldProps, Typography } from '@mui/material';
import { nanoid } from 'nanoid';

import { getRuntimeOutputVariable } from './type';

export default function OutputFormatCell({
  output,
  variable,
  TextFieldProps,
}: {
  assistant: AssistantYjs;
  output: OutputVariableYjs;
  variable?: VariableYjs;
  TextFieldProps?: TextFieldProps;
}) {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  const runtimeVariable = getRuntimeOutputVariable(output);
  if (runtimeVariable) return null;

  if (output.from?.type === 'input') return null;
  if (output.from?.type === 'output') return null;
  if (output.from?.type === 'callAgent') return null;
  if (output.from?.type === 'variable') return null;

  return (
    <>
      {dialog}

      <VariableTypeField
        variant="standard"
        {...TextFieldProps}
        value={(variable?.type ?? output).type || 'string'}
        onChange={(e) => {
          const type = e.target.value as any;

          if (output.variable?.key) {
            showDialog({
              formSx: {
                '.MuiDialogTitle-root': {
                  border: 0,
                },
                '.MuiDialogActions-root': {
                  border: 0,
                },
                '.save': {
                  background: '#d32f2f',
                },
              },
              maxWidth: 'sm',
              fullWidth: true,
              title: <Box sx={{ wordWrap: 'break-word' }}>{t('outputVariableParameter.changeTypeTitle')}</Box>,
              content: (
                <Box>
                  <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                    {t('outputVariableParameter.change')}
                  </Typography>
                </Box>
              ),
              okText: t('confirm'),
              okColor: 'error',
              cancelText: t('cancel'),
              onOk: () => {
                delete output.variable;

                output.type = type;
                if (output.type === 'array') {
                  output.element ??= { id: nanoid(), name: 'element', type: 'string' };
                }
              },
            });
          } else {
            output.type = type;
            if (output.type === 'array') {
              output.element ??= { id: nanoid(), name: 'element', type: 'string' };
            }
          }
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </>
  );
}

function VariableTypeField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField hiddenLabel placeholder={t('format')} select SelectProps={{ autoWidth: true }} {...props}>
      <MenuItem value="string">
        <ListItemIcon>
          <Icon icon={CursorTextIcon} />
        </ListItemIcon>
        {t('text')}
      </MenuItem>

      <MenuItem value="number">
        <ListItemIcon>
          <Icon icon={SquareNumberIcon} />
        </ListItemIcon>
        {t('number')}
      </MenuItem>

      <MenuItem value="boolean">
        <ListItemIcon>
          <Icon icon={ToggleLeftIcon} />
        </ListItemIcon>
        {t('boolean')}
      </MenuItem>

      <MenuItem value="object">
        <ListItemIcon>
          <Icon icon={CodePlusIcon} />
        </ListItemIcon>
        {t('object')}
      </MenuItem>

      <MenuItem value="array">
        <ListItemIcon>
          <Icon icon={BracketsContainIcon} />
        </ListItemIcon>
        {t('array')}
      </MenuItem>
    </TextField>
  );
}

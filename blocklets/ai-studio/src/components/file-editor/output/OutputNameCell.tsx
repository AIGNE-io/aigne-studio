import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import VariableIcon from '@iconify-icons/tabler/variable';
import { Stack, TextField, TextFieldProps, Typography } from '@mui/material';

import { getRuntimeOutputVariable } from './type';

export default function OutputNameCell({
  depth = 0,
  output,
  TextFieldProps,
}: {
  depth?: number;
  output: OutputVariableYjs;
  TextFieldProps?: TextFieldProps;
}) {
  const { t } = useLocaleContext();
  const runtimeVariable = getRuntimeOutputVariable(output);

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        gap: 1,
        border: 0,
        borderRadius: 1,
        whiteSpace: 'nowrap',
      }}>
      {runtimeVariable?.icon || (depth === 0 ? <Icon icon={VariableIcon} /> : undefined)}

      {runtimeVariable ? (
        <Typography>{t(runtimeVariable.i18nKey)}</Typography>
      ) : (
        <TextField
          variant="standard"
          fullWidth
          hiddenLabel
          placeholder={t('outputVariableName')}
          {...TextFieldProps}
          value={output.name || ''}
          onChange={(e) => (output.name = e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </Stack>
  );
}

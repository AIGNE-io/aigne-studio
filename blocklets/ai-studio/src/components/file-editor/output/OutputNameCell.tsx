import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Stack, TextField, TextFieldProps, Typography } from '@mui/material';

import { getRuntimeOutputVariable } from './type';

export default function OutputNameCell({
  output,
  TextFieldProps,
}: {
  output: OutputVariableYjs;
  TextFieldProps?: TextFieldProps;
}) {
  const { t } = useLocaleContext();
  const runtimeVariable = getRuntimeOutputVariable(output);

  return runtimeVariable ? (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
        gap: 1,
        border: 0,
        borderRadius: 1,
        whiteSpace: 'nowrap',
      }}>
      {runtimeVariable.icon}

      <Typography>{t(runtimeVariable.i18nKey)}</Typography>
    </Stack>
  ) : (
    <TextField
      variant="standard"
      fullWidth
      hiddenLabel
      placeholder={t('outputVariableName')}
      {...TextFieldProps}
      value={output.name || ''}
      onChange={(e) => (output.name = e.target.value)}
    />
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useAsync } from 'react-use';

import { getSupportedModels } from '../../libs/common';

export default function ModelSelectField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  const { value, loading, error } = useAsync(() => getSupportedModels(), []);
  if (error) throw error;

  return (
    <TextField {...props} select>
      {value?.map((model) => (
        <MenuItem key={model} value={model}>
          {model}
        </MenuItem>
      ))}
      {loading ? (
        <MenuItem disabled value="loading">
          {t('loading')}
        </MenuItem>
      ) : (
        !value?.length && (
          <MenuItem disabled value="empty">
            {t('noData')}
          </MenuItem>
        )
      )}
    </TextField>
  );
}

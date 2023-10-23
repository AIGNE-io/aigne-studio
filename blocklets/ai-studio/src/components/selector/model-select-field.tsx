import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { MenuItem, TextField, TextFieldProps } from '@mui/material';
import { useEffect } from 'react';
import { useAsync } from 'react-use';

import { getSupportedModels } from '../../libs/common';

export default function ModelSelectField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  const { value, loading, error } = useAsync(() => getSupportedModels(), []);
  if (error) throw error;

  useEffect(() => {
    const first = value?.[0]?.model;
    if (!props.value && first) {
      props.onChange?.({ target: { value: first } } as any);
    }
  }, [value, props.value]);

  return (
    <TextField {...props} select>
      {value?.map((model) => (
        <MenuItem key={model.model} value={model.model}>
          {model.model}
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

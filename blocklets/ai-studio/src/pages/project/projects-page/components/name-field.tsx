import { useSessionContext } from '@app/contexts/session';
import { checkProjectName } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { TextField } from '@mui/material';
import { useDebounceFn } from 'ahooks';
import { useEffect } from 'react';
import { Controller, UseFormReturn } from 'react-hook-form';

interface NameFieldProps {
  form: UseFormReturn<any & { name: string }>;
  currentName?: string;
  triggerOnMount?: boolean;
}

const NameField = ({ form, currentName, triggerOnMount = false }: NameFieldProps) => {
  const { t } = useLocaleContext();
  const { session } = useSessionContext();
  const { run: debouncedCheckProjectName } = useDebounceFn(() => form.trigger('name'), { wait: 300 });

  useEffect(() => {
    if (triggerOnMount) form.trigger('name');
  }, []);

  return (
    <Controller
      name="name"
      control={form.control}
      rules={{
        required: t('validation.fieldRequired'),
        validate: async (value) => {
          if (!value.trim()) return t('validation.whitespace');
          const res = await checkProjectName({ value, createdBy: session.user.did, currentName });
          return res.ok ? true : t('validation.nameExists');
        },
      }}
      render={({ field: { onChange, ...rest }, fieldState }) => (
        <TextField
          data-testid="projectNameField"
          placeholder={t('newProjectNamePlaceholder')}
          hiddenLabel
          autoFocus
          onChange={(e) => {
            onChange(e);
            debouncedCheckProjectName();
          }}
          sx={{ width: 1, '.MuiInputBase-root': { border: '1px solid #E5E7EB', borderRadius: '8px' } }}
          {...rest}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  );
};

export default NameField;

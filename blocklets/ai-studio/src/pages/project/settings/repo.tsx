import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Stack, TextField } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import Eye from '../icons/eye';
import EyeNo from '../icons/eye-no';

export default function ProjectRepo({
  url,
  token,
  onChangeUrl,
  onChangeToken,
}: {
  url: string;
  token: string;
  onChangeUrl: (data: string) => void;
  onChangeToken: (data: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<{ url: string; token: string }>({ defaultValues: { url, token } });

  const endAdornment = (
    <InputAdornment position="end">
      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="large">
        {showPassword ? <EyeNo /> : <Eye />}
      </IconButton>
    </InputAdornment>
  );

  const { t } = useLocaleContext();

  return (
    <Stack gap={2}>
      <Controller
        control={form.control}
        name="url"
        render={({ field, fieldState }) => {
          return (
            <TextField
              key="url"
              autoFocus
              fullWidth
              label={t('projectSetting.gitType.default.gitUrl')}
              defaultValue={url}
              {...form.register('url', {
                required: true,
                validate: (value) => /^http/.test(value) || t('projectSetting.gitType.default.validation.isHttp'),
              })}
              value={field.value}
              onChange={(e) => {
                const v = e.target.value;

                onChangeUrl(v);
                form.setValue('url', v, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
              }}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          );
        }}
      />

      <TextField
        key="token"
        fullWidth
        label={t('projectSetting.gitType.default.gitToken')}
        defaultValue={token}
        onChange={(e) => onChangeToken(e.target.value)}
        InputProps={{
          endAdornment,
        }}
        type={showPassword ? 'text' : 'password'}
      />
    </Stack>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RocketLaunchRounded } from '@mui/icons-material';
import { LoadingButton, LoadingButtonProps } from '@mui/lab';
import { Box, Stack } from '@mui/material';
import { omit } from 'lodash';
import { FormEvent, useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { PublicTemplate } from '../../api/templates';
import ParameterField from '../ParameterField';

export default function AIFormView({
  template,
  submitting,
  onSubmit,
  onCancel,
  SubmitProps,
}: {
  template: PublicTemplate;
  submitting?: boolean;
  onSubmit: (parameters: { [key: string]: string | number | undefined }) => any;
  onCancel?: () => any;
  SubmitProps?: LoadingButtonProps;
}) {
  const { t } = useLocaleContext();
  const params = useMemo(() => Object.keys(template.parameters ?? {}), [template.parameters]);

  const initForm = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(template.parameters ?? {}).map(([param, parameter]) => [
          param,
          parameter.defaultValue ??
            (!parameter.type || ['string', 'select', 'number', 'language'].includes(parameter.type) ? '' : undefined),
        ])
      ),
    [template.parameters]
  );

  const form = useForm<{ [key: string]: string | number | undefined }>({ defaultValues: initForm });

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (submitting) {
        onCancel?.();
      } else {
        form.handleSubmit(onSubmit)(e);
      }
    },
    [form, onCancel, onSubmit, submitting]
  );

  return (
    <Stack component="form" onSubmit={handleSubmit} gap={2}>
      <Stack gap={2}>
        {[...params].map((param) => {
          const parameter = template.parameters?.[param];

          const { required, min, max, minLength, maxLength } = (parameter as any) ?? {};

          return (
            <Box key={param}>
              <Controller
                control={form.control}
                name={param}
                render={({ field, fieldState }) => {
                  return (
                    <ParameterField
                      label={parameter?.label || param}
                      fullWidth
                      parameter={omit(parameter, 'min', 'max') as never}
                      maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
                      value={field.value}
                      onChange={(v) =>
                        form.setValue(param, v, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message || parameter?.helper}
                    />
                  );
                }}
                rules={{
                  required: required ? t('validation.fieldRequired') : undefined,
                  min: typeof min === 'number' ? { value: min, message: t('validation.fieldMin', { min }) } : undefined,
                  max: typeof max === 'number' ? { value: max, message: t('validation.fieldMax', { max }) } : undefined,
                  minLength:
                    typeof minLength === 'number'
                      ? { value: minLength, message: t('validation.fieldMinLength', { minLength }) }
                      : undefined,
                  maxLength:
                    typeof maxLength === 'number'
                      ? { value: maxLength, message: t('validation.fieldMaxLength', { maxLength }) }
                      : undefined,
                }}
              />
            </Box>
          );
        })}
      </Stack>

      <LoadingButton
        fullWidth
        type="submit"
        variant="contained"
        endIcon={<RocketLaunchRounded />}
        loading={submitting}
        loadingPosition="end"
        {...SubmitProps}>
        {SubmitProps?.children ?? (submitting ? t('cancel') : t('execute'))}
      </LoadingButton>
    </Stack>
  );
}

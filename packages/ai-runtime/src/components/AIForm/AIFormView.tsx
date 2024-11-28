import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RocketLaunchRounded } from '@mui/icons-material';
import { LoadingButton, LoadingButtonProps } from '@mui/lab';
import { Box, Stack } from '@mui/material';
import { FormEvent, useCallback, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { AssistantInfo } from '../../api/assistant';
import ParameterField from '../ParameterField';

export default function AIFormView({
  assistant,
  submitting,
  onSubmit,
  onCancel,
  SubmitProps,
}: {
  assistant: AssistantInfo;
  submitting?: boolean;
  onSubmit: (parameters: { [key: string]: string | number | undefined }) => any;
  onCancel?: () => any;
  SubmitProps?: LoadingButtonProps;
}) {
  const { t } = useLocaleContext();

  const parameters = useMemo(
    () => (assistant.parameters ?? []).filter((i): i is typeof i & { key: string } => !!i.key && !i.hidden),
    [assistant.parameters]
  );

  const initForm = useMemo(
    () => Object.fromEntries(parameters.map((parameter) => [parameter.key, parameter.defaultValue ?? ''])),
    [parameters]
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
        {parameters.map((parameter) => {
          const { required, min, max, minLength, maxLength } = (parameter as any) ?? {};

          return (
            <Box key={parameter.id}>
              <Controller
                control={form.control}
                name={parameter.key}
                rules={{
                  required: required ? t('validation.fieldRequired') : undefined,
                  min:
                    typeof min === 'number'
                      ? { value: min, message: t('validation.fieldMin', { min: min.toString() }) }
                      : undefined,
                  max:
                    typeof max === 'number'
                      ? { value: max, message: t('validation.fieldMax', { max: max.toString() }) }
                      : undefined,
                  minLength:
                    typeof minLength === 'number'
                      ? {
                          value: minLength,
                          message: t('validation.fieldMinLength', { minLength: minLength.toString() }),
                        }
                      : undefined,
                  maxLength:
                    typeof maxLength === 'number'
                      ? {
                          value: maxLength,
                          message: t('validation.fieldMaxLength', { maxLength: maxLength.toString() }),
                        }
                      : undefined,
                }}
                render={({ field, fieldState }) => {
                  return (
                    <ParameterField
                      label={parameter?.label || parameter.key}
                      fullWidth
                      parameter={parameter}
                      maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
                      value={field.value}
                      onChange={(value) => field.onChange({ target: { value } })}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message || parameter?.helper}
                    />
                  );
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

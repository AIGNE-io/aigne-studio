import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { cx } from '@emotion/css';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { Box, Button, FormLabel, IconButton, InputAdornment, Stack, formLabelClasses, styled } from '@mui/material';
import isEmpty from 'lodash/isEmpty';
import omit from 'lodash/omit';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { uploadImage } from '../../api/image';
import AgentInputField from '../../components/AgentInputField';
import LoadingButton from '../../components/LoadingButton';
import { useAgent } from '../../contexts/Agent';
import { useComponentPreferences } from '../../contexts/ComponentPreferences';
import { useCurrentAgent } from '../../contexts/CurrentAgent';
import { useSession } from '../../contexts/Session';
import { isValidInput } from '../../utils/agent-inputs';

const MAX_FILES = 3;

export default function AutoForm({
  submitText,
  inlineLabel,
  autoFillLastForm = true,
  submitInQuestionField,
  chatMode,
}: {
  submitText?: string;
  inlineLabel?: boolean;
  autoFillLastForm?: boolean;
  submitInQuestionField?: boolean;
  chatMode?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preferences = useComponentPreferences();
  const submitRef = useRef<HTMLButtonElement>(null);

  const { t } = useLocaleContext();
  const { aid } = useCurrentAgent();
  const agent = useAgent({ aid });

  const { running, runAgent: execute } = useSession((s) => ({ running: s.running, runAgent: s.runAgent }));

  const parameters = useMemo(
    () =>
      agent.parameters
        ?.filter((i) => isValidInput(i) && !preferences?.hideInputFields?.includes(i.key))
        .map((i) => ({ ...i, label: i.label?.trim() || undefined })),
    [agent.parameters]
  );

  const imageParameter = useMemo(() => parameters?.filter((i) => i.type === 'image')[0], [parameters]);

  const initialFormValues = useInitialFormValues();
  const defaultForm = useMemo(() => {
    return { ...initialFormValues, ...(imageParameter ? { [imageParameter.key!]: [] } : {}) };
  }, [initialFormValues, imageParameter]);

  const form = useForm({ defaultValues: defaultForm });

  const submitDisabled = !form.formState.isValid;

  useEffect(() => {
    if (preferences?.autoGenerate && !form.formState.submitCount) {
      submitRef.current?.form?.requestSubmit();
    }
  }, [defaultForm, preferences?.autoGenerate]);

  useEffect(() => {
    if (autoFillLastForm && !form.formState.isSubmitted && !form.formState.isSubmitting) {
      form.reset(chatMode ? omit(defaultForm, 'question') : defaultForm);
    }
  }, [defaultForm, autoFillLastForm, form, chatMode]);

  const onSubmit = async (parameters: any) => {
    submitRef.current?.scrollIntoView({ block: 'center' });
    await execute({
      aid,
      parameters,
      onResponseStart: () => {
        if (chatMode) form.resetField('question', { defaultValue: '' });
      },
    });
  };

  const isInInput = submitInQuestionField && parameters?.some((i) => i.key === 'question');
  const renderImageUploadIcon = () => {
    if (!imageParameter) return null;

    return (
      <Controller
        control={form.control}
        name={imageParameter.key!}
        render={({ field }) => {
          const handleFiles = async (files: File[]) => {
            const old = form.getValues(imageParameter.key!) || [];
            if (old.length + files.length > MAX_FILES) {
              Toast.error(t('maxFilesLimit', { limit: MAX_FILES }));
              return;
            }

            try {
              const formData = new FormData();
              files.forEach((file) => formData.append('images', file));

              const response = await uploadImage({ input: formData });

              const urls = Array.isArray(old) ? old : [old];
              field.onChange({ target: { value: [...urls, ...response.uploads.map((upload) => upload.url)] } });
            } catch (error) {
              Toast.error(error.message);
            }
          };

          return (
            <>
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  handleFiles(files);
                }}
              />
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={(field.value || []).length >= MAX_FILES}>
                <AttachFileIcon sx={{ fontSize: !isInInput ? 20 : 18 }} />
              </IconButton>
            </>
          );
        }}
      />
    );
  };

  const previewsValue = useWatch({
    control: form.control,
    name: imageParameter?.key || '',
  });

  const renderImageUploadPreview = () => {
    if (!imageParameter) return null;

    return (
      <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
        {Array.isArray(previewsValue) &&
          previewsValue.map((url, index) => (
            <Box key={url} position="relative" display="flex">
              <img
                src={url}
                alt={`Uploaded ${index + 1}`}
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
              <Button
                size="small"
                sx={{ position: 'absolute', top: 0, right: 0, minWidth: 'unset', p: 0.5 }}
                onClick={() => {
                  const newUrls = previewsValue.filter((_: any, i: any) => i !== index);
                  form.setValue(imageParameter.key!, newUrls);
                }}>
                <DeleteIcon style={{ color: 'red' }} />
              </Button>
            </Box>
          ))}
      </Stack>
    );
  };

  return (
    <Form
      component="form"
      className={cx('form', `label-position-${inlineLabel ? 'start' : 'top'}`)}
      onSubmit={form.handleSubmit(onSubmit)}>
      {isInInput && renderImageUploadPreview()}

      {parameters?.map((parameter, index) => {
        const { key, required } = parameter ?? {};
        if (!key) return null;
        if (parameter.type === 'image') return null;

        return (
          <Box key={parameter.id}>
            <Controller
              control={form.control}
              name={key}
              rules={{
                required: required || key === 'question',
                min:
                  parameter.type === 'number' && typeof parameter.min === 'number'
                    ? { value: parameter.min, message: '' }
                    : undefined,
                max:
                  parameter.type === 'number' && typeof parameter.max === 'number'
                    ? { value: parameter.max, message: '' }
                    : undefined,
                minLength:
                  parameter.type === 'string' && typeof parameter.minLength === 'number'
                    ? { value: parameter.minLength, message: '' }
                    : undefined,
                maxLength:
                  parameter.type === 'string' && typeof parameter.maxLength === 'number'
                    ? { value: parameter.maxLength, message: '' }
                    : undefined,
              }}
              render={({ field, fieldState }) => {
                return (
                  <Stack className="form-item">
                    {parameter.label && <FormLabel>{parameter.label}</FormLabel>}

                    <AgentInputField
                      inputProps={{ 'data-testid': `runtime-input-${key}` }}
                      inputRef={field.ref}
                      autoFocus={index === 0}
                      size="small"
                      hiddenLabel
                      fullWidth
                      label={undefined}
                      parameter={parameter}
                      maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
                      value={field.value || ''}
                      onChange={(value) => field.onChange({ target: { value } })}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message || parameter?.helper}
                      sx={{ flex: 1 }}
                      InputProps={{
                        ...(parameter.key === 'question' && submitInQuestionField
                          ? {
                              endAdornment: (
                                <InputAdornment position="end" sx={{ py: 3, mr: -0.75, alignSelf: 'flex-end' }}>
                                  <Stack direction="row" alignItems="center" gap={1}>
                                    {renderImageUploadIcon()}

                                    <LoadingButton
                                      data-testid="runtime-submit-button"
                                      ref={submitRef}
                                      type="submit"
                                      variant="contained"
                                      loading={running}
                                      disabled={submitDisabled}
                                      sx={{ borderRadius: 1.5 }}>
                                      {submitText}
                                    </LoadingButton>
                                  </Stack>
                                </InputAdornment>
                              ),
                            }
                          : {}),
                      }}
                    />
                  </Stack>
                );
              }}
            />
          </Box>
        );
      })}

      {!isInInput && (
        <Stack gap={1}>
          {renderImageUploadPreview()}

          <Stack gap={1} direction="row" alignItems="center">
            {renderImageUploadIcon()}

            <LoadingButton
              data-testid="runtime-submit-button"
              ref={submitRef}
              type="submit"
              variant="contained"
              loading={running}
              disabled={submitDisabled}
              sx={{ height: 40, flex: 1 }}>
              {submitText || t('generate')}
            </LoadingButton>
          </Stack>
        </Stack>
      )}
    </Form>
  );
}

function useInitialFormValues() {
  const preferences = useComponentPreferences();
  const { aid } = useCurrentAgent();
  const agent = useAgent({ aid });

  const lastMessage = useSession((s) => s.messages?.at(0));

  const [lastInputs, setLastInputs] = useState<any>();

  useEffect(() => {
    setLastInputs(undefined);
  }, [aid]);

  useEffect(() => {
    if (!lastInputs) {
      const lastParameters = lastMessage?.inputs;
      if (!isEmpty(lastParameters)) setLastInputs(lastParameters);
    }
  }, [lastMessage]);

  return useMemo(() => {
    if (preferences?.initialInputValues) return preferences.initialInputValues;

    if (lastInputs) {
      return lastInputs;
    }

    return Object.fromEntries(agent.parameters?.map((parameter) => [parameter.key, parameter.defaultValue]) ?? []);
  }, [lastInputs, agent, preferences?.initialInputValues]);
}

const Form = styled(Stack)(({ theme }) =>
  theme.unstable_sx({
    gap: 2,

    '.form-item': {
      gap: 0.5,

      [`.${formLabelClasses.root}`]: {
        fontWeight: 500,
        color: 'text.primary',
      },
    },

    '&.label-position-start': {
      '.form-item': {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
      },
    },
  })
) as typeof Stack;

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ArrowDropDownRounded } from '@mui/icons-material';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  Stack,
  TextField,
  Typography,
  selectClasses,
} from '@mui/material';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Joi from 'joi';
import { useCallback, useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import { TemplateYjs } from '../../../api/src/store/projects';
import { CallAPIMessage, CallFuncMessage, CallPromptMessage, ToolsMessage } from '../../../api/src/store/templates';
import { parseDirectivesOfTemplate, useToolsState } from '../../pages/project/prompt-state';
import {
  createFile,
  isCallAPIMessage,
  isCallFuncMessage,
  isCallPromptMessage,
  isTemplate,
  useStore,
} from '../../pages/project/yjs-state';
import dirname from '../../utils/path';
import CodeEditor from './code-editer';
import TemplateAutocomplete from './template-autocomplete';

const toolsSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  parameters: Joi.object({
    type: Joi.string().valid('object').required(),
    properties: Joi.object().pattern(Joi.string(), Joi.any()).required(),
    required: Joi.array().items(Joi.string()),
  }).required(),
});

const callPromptMessageSchema = Joi.object({
  id: Joi.string().required(),
  role: Joi.string().valid('call-prompt').required(),
  content: Joi.any().forbidden(),
  output: Joi.string().optional(),
  template: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().optional(),
  }).required(),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  visibility: Joi.string().valid('hidden').optional(),
});

const callAPIMessageSchema = Joi.object({
  id: Joi.string().required(),
  role: Joi.string().valid('call-api').required(),
  content: Joi.any().forbidden(),
  method: Joi.string().required(),
  url: Joi.string().uri().required(),
  body: Joi.string().optional(),
  output: Joi.string().optional(),
  visibility: Joi.string().valid('hidden').optional(),
});

const callFunctionMessageSchema = Joi.object({
  id: Joi.string().required(),
  role: Joi.string().valid('call-function').required(),
  content: Joi.any().forbidden(),
  code: Joi.string().required(),
  output: Joi.string().optional(),
  visibility: Joi.string().valid('hidden').optional(),
});

export function useOptions(): {
  options: { key: string; label: string }[];
  getOption: (role?: string) => string | undefined;
} {
  const { t } = useLocaleContext();

  const options = useMemo(() => {
    return [
      {
        key: 'call-prompt',
        label: t('functionCall.types.prompt'),
      },
      {
        key: 'call-api',
        label: t('functionCall.types.api'),
      },
      {
        key: 'call-function',
        label: t('functionCall.types.code'),
      },
    ];
  }, [t]);

  const getOption = useCallback(
    (role?: string) => {
      if (!role) {
        return '';
      }

      return options.find((x) => x.key === role)?.label;
    },
    [options]
  );

  return { options, getOption };
}

export default function FunctionCallDialog({
  projectId,
  gitRef,
  template,
  state,
  onClose = () => {},
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  state: { call?: ToolsMessage | null };
  onClose?: () => void;
}) {
  const { t } = useLocaleContext();

  const { addFunc } = useToolsState({ projectId, gitRef, templateId: template.id });
  const { store, getTemplateById } = useStore(projectId, gitRef);
  const { '*': filepath } = useParams();

  const form = useForm<{ function: string; extraInfo: CallPromptMessage | CallAPIMessage | CallFuncMessage }>({});
  const { getOption } = useOptions();

  const onCloseDialog = () => {
    state.call = null;

    onClose();
  };

  useEffect(() => {
    setTimeout(() => {
      if (state.call) {
        form.setValue('function', JSON.stringify(state.call?.function, null, 2), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        form.setValue('extraInfo', state.call?.extraInfo, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    }, 0);
  }, []);

  const onSave = useCallback(
    async (input: { function: string; extraInfo: CallPromptMessage | CallAPIMessage | CallFuncMessage }) => {
      const data = {
        id: state.call?.id || '',
        extraInfo: input.extraInfo,
        function: JSON.parse(input.function),
      };

      addFunc(data);

      onCloseDialog();
    },
    [state, form]
  );

  const option = getOption(state.call?.extraInfo?.role);

  return (
    <Dialog
      open
      keepMounted={false}
      component="form"
      onSubmit={form.handleSubmit(onSave)}
      maxWidth="sm"
      fullWidth
      onClose={onCloseDialog}>
      <DialogTitle>{option}</DialogTitle>
      <DialogContent>
        <Stack gap={2}>
          <Box>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1, fontSize: 14, color: (theme) => theme.palette.common.black }}>
              <Box>{t('functionCall.parameterTip')}</Box>
              <Box
                component={Link}
                to="https://platform.openai.com/docs/api-reference/chat/create#chat-create-functions"
                sx={{ color: (theme) => theme.palette.grey[500], fontSize: '12px' }}>
                {t('functionCall.viewGuide')}
              </Box>
            </Box>
            <Controller
              control={form.control}
              name="function"
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <CodeEditor
                      ref={field.ref}
                      defaultLanguage="json"
                      language="json"
                      value={typeof field.value === 'object' ? JSON.stringify(field.value, null, 2) : field.value}
                      onChange={(v) =>
                        form.setValue('function', v || '', {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      onMount={() => {
                        if (state.call?.function) {
                          form.setValue('function', JSON.stringify(state.call?.function, null, 2), {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      height="200px"
                    />

                    {fieldState.error?.message ? (
                      <FormHelperText required error>
                        {fieldState.error?.message}
                      </FormHelperText>
                    ) : (
                      <FormHelperText sx={{ color: '#0E9F6E' }}>{t('functionCall.validate.json')}</FormHelperText>
                    )}
                  </Box>
                );
              }}
              rules={{
                validate: (value) => {
                  if (!value) {
                    return t('functionCall.validate.notEmpty');
                  }

                  if (typeof value === 'object') {
                    const { error } = toolsSchema.validate(value);
                    if (error) {
                      return error?.message;
                    }

                    return true;
                  }

                  if (typeof value === 'string') {
                    try {
                      const json = JSON.parse(value);

                      const { error } = toolsSchema.validate(json);
                      if (error) {
                        return error?.message;
                      }

                      return true;
                    } catch (error) {
                      return error?.message;
                    }
                  }

                  return true;
                },
              }}
            />
          </Box>

          <Box>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1, fontSize: 14, color: (theme) => theme.palette.common.black }}>
              <Box>{t('functionCall.dataTip')}</Box>
            </Box>
            <Controller
              control={form.control}
              name="extraInfo"
              render={({ field, fieldState }) => {
                if (isCallPromptMessage(field.value)) {
                  const targetId = field.value?.id;
                  const target = targetId ? getTemplateById(targetId) : undefined;
                  const templates = Object.values(store.files)
                    .filter(isTemplate)
                    .filter((i) => i.id !== template.id);

                  return (
                    <>
                      <Stack>
                        <Typography variant="caption">{t('call.prompt.select')}</Typography>

                        <TemplateAutocomplete
                          sx={{ flex: 1 }}
                          fullWidth
                          freeSolo
                          value={target}
                          onChange={(_, value) => {
                            if (value && typeof value === 'object') {
                              const val = isCallPromptMessage(field.value) ? field.value : ({} as CallPromptMessage);

                              val.template = { id: value.id, name: value.name };
                              const temp = getTemplateById(value.id);
                              if (temp) {
                                const p = parseDirectivesOfTemplate(temp, { excludeNonPromptVariables: true })
                                  .filter((i) => i.type === 'variable')
                                  .map((i) => i.name);

                                val.parameters = Object.fromEntries(p.map((r) => [r, '']));
                              }

                              form.setValue('extraInfo', val, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                            }
                          }}
                          popupIcon={<ArrowDropDownRounded />}
                          forcePopupIcon
                          disableClearable
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder={t('selectObject', { object: t('template') })}
                              hiddenLabel
                            />
                          )}
                          options={templates}
                          createTemplate={async (data) =>
                            createFile({ store, parent: dirname(filepath), meta: data }).template
                          }
                        />
                      </Stack>

                      {fieldState.error?.message && (
                        <FormHelperText required error>
                          {fieldState.error?.message}
                        </FormHelperText>
                      )}
                    </>
                  );
                }

                if (isCallAPIMessage(field.value)) {
                  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

                  return (
                    <>
                      <Stack>
                        <Typography variant="caption">{t('call.api.placeholder')}</Typography>

                        <Stack flex={1} direction="row" alignItems="center" gap={1}>
                          <Select
                            sx={{
                              width: 80,
                              [`.${selectClasses.select}`]: {
                                fontSize: 12,
                                px: 1,
                                pr: '18px !important',
                              },
                              [`.${selectClasses.icon}`]: {
                                fontSize: 16,
                                right: 2,
                              },
                            }}
                            value={(field.value as CallAPIMessage)?.method || ''}
                            onChange={(e) => {
                              const val = isCallAPIMessage(field.value) ? field.value : ({} as CallAPIMessage);
                              val.method = e.target.value;

                              form.setValue('extraInfo', val, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                            }}>
                            {methods.map((method) => {
                              return (
                                <MenuItem value={method.toLocaleLowerCase()} key={method.toLocaleLowerCase()}>
                                  {method.toLocaleUpperCase()}
                                </MenuItem>
                              );
                            })}
                          </Select>

                          <TextField
                            sx={{ flex: 1 }}
                            hiddenLabel
                            placeholder={t('call.api.placeholder')}
                            value={(field.value as CallAPIMessage)?.url || ''}
                            onChange={(e) => {
                              const val = isCallAPIMessage(field.value) ? field.value : ({} as CallAPIMessage);
                              val.url = e.target.value;

                              form.setValue('extraInfo', val, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                        </Stack>
                      </Stack>

                      {fieldState.error?.message && (
                        <FormHelperText required error>
                          {fieldState.error?.message}
                        </FormHelperText>
                      )}
                    </>
                  );
                }

                if (isCallFuncMessage(field.value)) {
                  return (
                    <>
                      <Stack>
                        <Typography variant="caption">{t('call.func.code')}</Typography>

                        <CodeEditor
                          defaultLanguage="javascript"
                          language="javascript"
                          value={(field.value as CallFuncMessage)?.code || ''}
                          onChange={(value) => {
                            const val = isCallFuncMessage(field.value) ? field.value : ({} as CallFuncMessage);
                            val.code = value || '';

                            form.setValue('extraInfo', val, {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            });
                          }}
                          onMount={() => {
                            if (state.call?.extraInfo) {
                              form.setValue('extraInfo', state.call?.extraInfo, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                            }
                          }}
                        />
                      </Stack>

                      {fieldState.error?.message && (
                        <FormHelperText required error>
                          {fieldState.error?.message}
                        </FormHelperText>
                      )}
                    </>
                  );
                }

                return <Box />;
              }}
              rules={{
                validate: (value) => {
                  if (!value) {
                    return t('functionCall.validate.notEmpty');
                  }

                  if (!Object.values(value).length) {
                    return true;
                  }

                  if (isCallPromptMessage(value)) {
                    const { error } = callPromptMessageSchema.validate(value);
                    if (error) {
                      return error?.message;
                    }

                    return true;
                  }

                  if (isCallAPIMessage(value)) {
                    const { error } = callAPIMessageSchema.validate(value);
                    if (error) {
                      return error?.message;
                    }

                    return true;
                  }

                  if (isCallFuncMessage(value)) {
                    const { error } = callFunctionMessageSchema.validate(value);
                    if (error) {
                      return error?.message;
                    }

                    return true;
                  }

                  return t('functionCall.validate.notSupported');
                },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCloseDialog}>{t('cancel')}</Button>

        <Button
          type="submit"
          variant="contained"
          autoFocus
          disabled={!form.formState.isValid || form.formState.isSubmitting}>
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

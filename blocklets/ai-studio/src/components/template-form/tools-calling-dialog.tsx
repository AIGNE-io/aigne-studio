import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { useMonaco } from '@monaco-editor/react';
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
import { cloneDeep } from 'lodash';
import { useCallback, useEffect, useMemo, useRef } from 'react';
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

const useSchema = () => {
  const { t } = useLocaleContext();

  const toolsSchema = useMemo(() => {
    return Joi.object({
      name: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.parameter.name.base'),
          'string.empty': t('validateTools.parameter.name.empty'),
          'any.required': t('validateTools.parameter.name.required'),
        }),
      description: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.parameter.description.base'),
          'string.empty': t('validateTools.parameter.description.empty'),
          'any.required': t('validateTools.parameter.description.required'),
        }),
      parameters: Joi.object({
        type: Joi.string()
          .valid('object')
          .required()
          .messages({
            'string.base': t('validateTools.parameter.type.base'),
            'any.only': t('validateTools.parameter.type.only'),
            'any.required': t('validateTools.parameter.type.required'),
          }),
        properties: Joi.object()
          .pattern(Joi.string(), Joi.any())
          .required()
          .messages({
            'object.base': t('validateTools.parameter.properties.base'),
            'any.required': t('validateTools.parameter.properties.required'),
          }),
        required: Joi.array()
          .items(Joi.string())
          .messages({
            'array.base': t('validateTools.parameter.required.base'),
          }),
      }).required(),
    });
  }, [t]);

  const callPromptMessageSchema = useMemo(() => {
    return Joi.object({
      id: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.prompt.id.base'),
          'string.empty': t('validateTools.prompt.id.empty'),
          'any.required': t('validateTools.prompt.id.required'),
        }),
      role: Joi.string().valid('call-prompt').required(),
      content: Joi.any().forbidden(),
      output: Joi.string().optional(),
      template: Joi.object({
        id: Joi.string()
          .required()
          .messages({
            'string.base': t('validateTools.prompt.templateId.base'),
            'any.required': t('validateTools.prompt.templateId.required'),
          }),
        name: Joi.string()
          .optional()
          .messages({
            'string.base': t('validateTools.prompt.templateName.base'),
          }),
      })
        .required()
        .messages({
          'object.base': t('validateTools.prompt.template.base'),
          'any.required': t('validateTools.prompt.template.required'),
        }),
      parameters: Joi.object()
        .pattern(Joi.string(), Joi.any())
        .optional()
        .messages({
          'object.base': t('validateTools.prompt.parameters.base'),
        }),
      visibility: Joi.string().valid('hidden').optional(),
    });
  }, [t]);

  const callAPIMessageSchema = useMemo(() => {
    return Joi.object({
      id: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.api.id.base'),
          'string.empty': t('validateTools.api.id.empty'),
          'any.required': t('validateTools.api.id.required'),
        }),
      role: Joi.string().valid('call-api').required(),
      content: Joi.any().forbidden(),
      method: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.api.method.base'),
          'string.empty': t('validateTools.api.method.empty'),
          'any.required': t('validateTools.api.method.required'),
        }),
      url: Joi.string()
        .uri()
        .required()
        .messages({
          'string.base': t('validateTools.api.url.base'),
          'string.uri': t('validateTools.api.url.uri'),
          'any.required': t('validateTools.api.url.required'),
        }),
      body: Joi.string().optional(),
      output: Joi.string().optional(),
      visibility: Joi.string().valid('hidden').optional(),
    });
  }, [t]);

  const callFunctionMessageSchema = useMemo(() => {
    return Joi.object({
      id: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.func.id.base'),
          'string.empty': t('validateTools.func.id.empty'),
          'any.required': t('validateTools.func.id.required'),
        }),
      role: Joi.string().valid('call-function').required(),
      content: Joi.any().forbidden(),
      code: Joi.string()
        .required()
        .messages({
          'string.base': t('validateTools.func.code.base'),
          'string.empty': t('validateTools.func.code.empty'),
          'any.required': t('validateTools.func.code.required'),
        }),
      output: Joi.string().optional(),
      visibility: Joi.string().valid('hidden').optional(),
    });
  }, [t]);

  return {
    toolsSchema,
    callPromptMessageSchema,
    callAPIMessageSchema,
    callFunctionMessageSchema,
  };
};

function convertSchemaToTypescript(properties: { [keyof: string]: { type: string } }) {
  const lines = Object.entries(properties).map(([key, value]) => {
    return `${key}: ${value.type};`;
  });

  if (!lines.length) {
    return '';
  }

  return `declare const parameters: { ${lines.join('\n')} };`;
}

export function useOptions(): {
  options: { key: string; label: string }[];
  getOption: (role?: string) => string | undefined;
} {
  const { t } = useLocaleContext();

  const options = useMemo(() => {
    return [
      {
        key: 'call-prompt',
        label: t('tool.types.prompt'),
      },
      {
        key: 'call-api',
        label: t('tool.types.api'),
      },
      {
        key: 'call-function',
        label: t('tool.types.code'),
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

export default function ToolFunctionCallDialog({
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
  const { toolsSchema, callPromptMessageSchema, callAPIMessageSchema, callFunctionMessageSchema } = useSchema();

  const { addToolFunc } = useToolsState({ projectId, gitRef, templateId: template.id });
  const { store, getTemplateById } = useStore(projectId, gitRef);
  const { '*': filepath } = useParams();
  const targetEditorRef = useRef(null);

  const form = useForm<{ function: string; extraInfo: CallPromptMessage | CallAPIMessage | CallFuncMessage }>({});
  const monaco = useMonaco();
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
        extraInfo: cloneDeep(input.extraInfo),
        function: JSON.parse(input.function),
      };

      addToolFunc(data);

      onCloseDialog();
    },
    [state, form]
  );

  useEffect(() => {
    if (monaco) {
      const funcsCodes = form.watch('function');
      let obj: { parameters?: any } = {};
      try {
        obj = JSON.parse(funcsCodes);
      } catch (error) {
        // error
      }
      const customTypeDefinitions = convertSchemaToTypescript(obj?.parameters?.properties || {});
      if (!customTypeDefinitions) return;

      monaco?.languages?.typescript?.javascriptDefaults?.addExtraLib?.(customTypeDefinitions, 'custom.parameters.d.ts');
      monaco?.languages?.typescript?.typescriptDefaults?.addExtraLib?.(customTypeDefinitions, 'custom.parameters.d.ts');
    }
  }, [monaco]);

  const option = getOption(state.call?.extraInfo?.role);

  const parameterRule = useCallback(
    (json: ToolsMessage['function']) => {
      const { error } = toolsSchema.validate(json);
      if (error) {
        return error?.message;
      }

      const tools = cloneDeep(template?.tools || {});
      if (state.call?.id) {
        delete tools[state.call?.id];
      }

      const names = Object.values(tools)
        .map((tool) => {
          return tool.data?.function?.name;
        })
        .filter(Boolean);

      if (names.includes(json.name)) {
        return t('validateTools.parameter.name.exit');
      }

      return true;
    },
    [state.call?.id, template.tools, t]
  );

  return (
    <Dialog
      open
      keepMounted={false}
      component="form"
      onSubmit={form.handleSubmit(onSave)}
      maxWidth="md"
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
              <Box>{t('tool.parameterTip')}</Box>
              <Box
                component={Link}
                target="_blank"
                to="https://platform.openai.com/docs/api-reference/chat/create#chat-create-functions"
                sx={{ color: (theme) => theme.palette.grey[500], fontSize: '12px' }}>
                {t('tool.viewGuide')}
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
                      height="400px"
                    />

                    {fieldState.error?.message ? (
                      <FormHelperText required error>
                        {fieldState.error?.message}
                      </FormHelperText>
                    ) : (
                      <FormHelperText sx={{ color: '#0E9F6E' }}>{t('tool.validate.json')}</FormHelperText>
                    )}
                  </Box>
                );
              }}
              rules={{
                validate: (value) => {
                  if (!value) {
                    return t('tool.validate.notEmpty');
                  }

                  if (typeof value === 'object') {
                    return parameterRule(value);
                  }

                  if (typeof value === 'string') {
                    try {
                      const json = JSON.parse(value);
                      return parameterRule(json);
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
              <Box>{t('tool.dataTip')}</Box>
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
                          onMount={(editor) => {
                            targetEditorRef.current = editor;
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
                    return t('tool.validate.notEmpty');
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

                  return t('tool.validate.notSupported');
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

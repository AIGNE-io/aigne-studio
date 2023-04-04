import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import {
  Add,
  ArrowDropDown,
  CopyAll,
  Delete,
  ImportExport,
  SaveOutlined,
  Settings,
  TravelExplore,
} from '@mui/icons-material';
import {
  Box,
  Button,
  ClickAwayListener,
  DialogActions,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useReactive } from 'ahooks';
import equal from 'fast-deep-equal';
import { saveAs } from 'file-saver';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import Joi from 'joi';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useBeforeUnload, useSearchParams } from 'react-router-dom';
import { stringify } from 'yaml';

import { TemplateInput } from '../../../api/src/routes/templates';
import {
  HoroscopeParameter,
  LanguageParameter,
  NumberParameter,
  Parameter,
  SelectParameter,
  StringParameter,
  Template,
} from '../../../api/src/store/templates';
import { getErrorMessage } from '../../libs/api';
import encode from '../../libs/encode';
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../../libs/templates';
import useDialog from '../../utils/use-dialog';
import useMenu from '../../utils/use-menu';
import usePopper from '../../utils/use-popper';
import ParameterField, { parameterToStringValue } from '../parameter-field';
import BranchForm from './branch-form';
import ParameterConfig from './parameter-config';
import TagsAutoComplete from './tags-autocomplete';

export type TemplateForm = Pick<
  Template,
  '_id' | 'mode' | 'type' | 'name' | 'icon' | 'tags' | 'description' | 'template' | 'parameters'
> & {
  branch?: Omit<Template['branch'], 'branches'> & {
    branches: { template?: { id: string; name: string }; description: string }[];
  };
};

const INIT_FORM: TemplateForm = {
  _id: '',
  name: '',
};

export default function TemplateFormView({ onExecute }: { onExecute?: (template: Template) => void }) {
  const { t } = useLocaleContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const state = useTemplates();
  const { menu, showMenu } = useMenu();

  const original = useRef({ ...INIT_FORM });
  const [form, setForm] = useState(INIT_FORM);

  const updateForm = useCallback(
    (update: typeof form | ((value: WritableDraft<typeof form>) => void)) => {
      setForm((form) =>
        typeof update === 'function'
          ? produce(form, (draft) => {
              update(draft);
            })
          : update
      );
    },
    [setForm]
  );

  const resetForm = useCallback(
    (value?: typeof form) => {
      const form = JSON.parse(JSON.stringify(value ?? INIT_FORM));
      original.current = form;
      setForm(form);

      setSearchParams((prev) => {
        if (typeof value?._id === 'string') prev.set('templateId', value._id);
        else prev.delete('templateId');
        return prev;
      });
    },
    [setSearchParams]
  );

  const formChanged = !equal(original.current, form);
  const formIsInitial = equal(form, INIT_FORM);
  const needSave = formChanged || (!formIsInitial && !form._id);

  useBeforeUnload(
    useCallback(
      (e) => {
        if (needSave) {
          e.returnValue = t('alert.discardChanges');
        }
      },
      [needSave]
    )
  );

  const deferredTemplate = useDeferredValue(form.template);

  const params = useMemo(() => matchParams(deferredTemplate ?? ''), [deferredTemplate]);

  const [, setError] = useState<Joi.ValidationError>();

  const submit = () => {
    const getValueSchema = (parameter: Parameter) => {
      return {
        string: (parameter: StringParameter) => {
          let s = Joi.string();
          if (parameter.required) {
            s = s.required();
          } else {
            s = s.allow('');
          }
          if (typeof parameter.minLength === 'number') {
            s = s.min(parameter.minLength);
          }
          if (typeof parameter.maxLength === 'number') {
            s = s.max(parameter.maxLength);
          }
          return s;
        },
        number: (parameter: NumberParameter) => {
          let s = Joi.number();
          if (parameter.required) {
            s = s.required();
          }
          if (typeof parameter.min === 'number') {
            s = s.min(parameter.min);
          }
          if (typeof parameter.max === 'number') {
            s = s.max(parameter.max);
          }
          return s;
        },
        select: (parameter: SelectParameter) => {
          let s = Joi.string();
          if (parameter.required) {
            s = s.required();
          }
          return s;
        },
        language: (parameter: LanguageParameter) => {
          let s = Joi.string();
          if (parameter.required) {
            s = s.required();
          }
          return s;
        },
        horoscope: (parameter: HoroscopeParameter) => {
          let s = Joi.object({
            time: Joi.string().required(),
            offset: Joi.number().integer(),
            location: Joi.object({
              id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
              latitude: Joi.number().required(),
              longitude: Joi.number().required(),
              name: Joi.string().required(),
            }).required(),
          });
          if (parameter.required) {
            s = s.required();
          }
          return s;
        },
      }[parameter.type || 'string'](parameter as any);
    };

    const schema = Joi.object(
      Object.fromEntries(
        params.map((param) => {
          const parameter = form.parameters?.[param];
          return [param, parameter ? getValueSchema(parameter) : undefined];
        })
      )
    );

    setError(undefined);
    const { error, value } = schema.validate(
      Object.fromEntries(
        Object.entries(form.parameters ?? {}).map(([key, { value, defaultValue }]) => [key, value ?? defaultValue])
      ),
      { allowUnknown: true, abortEarly: false }
    );
    if (error) {
      setError(error);
      return;
    }
    onExecute?.(
      JSON.parse(
        JSON.stringify({
          ...form,
          parameters: Object.fromEntries(
            Object.entries(form.parameters ?? {}).map(([param, parameter]) => [
              param,
              { ...parameter, value: value[param] },
            ])
          ),
        })
      )
    );
  };

  // set init form
  useEffect(() => {
    if (templateId === '') {
      return;
    }
    const template = state.templates.find((i) => i._id === templateId) ?? state.templates.at(0);
    if (template && template._id !== form._id) resetForm(template);
  }, [state.templates.length, templateId]);

  const { dialog, showDialog } = useDialog();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.name')}
          size="small"
          value={form.name}
          onChange={(e) => updateForm((form) => (form.name = e.target.value))}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={(e) =>
                    showMenu({
                      anchorEl: e.currentTarget,
                      anchorOrigin: { horizontal: 'right', vertical: 'bottom' },
                      transformOrigin: { horizontal: 'right', vertical: 'top' },
                      PaperProps: { sx: { maxHeight: '50vh', width: 300 } },
                      children: (
                        <TemplateList {...state} current={form} onCurrentChange={(template) => resetForm(template)} />
                      ),
                    })
                  }>
                  <ArrowDropDown fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        {menu}
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <FormLabel sx={{ mr: 2 }}>{t('form.mode')}</FormLabel>
          <RadioGroup
            row
            value={form.mode ?? 'default'}
            onChange={(_, value) => updateForm((f) => (f.mode = value as any))}>
            <FormControlLabel value="default" control={<Radio />} label={t('form.default')} />
            <FormControlLabel value="chat" control={<Radio />} label={t('form.chat')} />
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label={t('form.type')}
          size="small"
          value={form.type ?? 'prompt'}
          onChange={(e) =>
            updateForm((form) => {
              const type = e.target.value as any;
              if (type === 'prompt') {
                delete form.type;
              } else {
                form.type = type;
              }
            })
          }>
          <MenuItem value="prompt">{t('form.prompt')}</MenuItem>
          <MenuItem value="branch">{t('form.branch')}</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.icon')}
          size="small"
          value={form.icon ?? ''}
          onChange={(e) => updateForm((form) => (form.icon = e.target.value))}
          InputProps={{
            startAdornment: form.icon && (
              <InputAdornment position="start">
                <Icon icon={form.icon} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => window.open('https://icon-sets.iconify.design/?query=', '_blank')}>
                  <TravelExplore fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.description')}
          size="small"
          value={form.description ?? ''}
          onChange={(e) => updateForm((form) => (form.description = e.target.value))}
          multiline
          minRows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <TagsAutoComplete value={form.tags ?? []} onChange={(_, value) => updateForm((form) => (form.tags = value))} />
      </Grid>

      <Grid item xs={12}>
        {form.type === 'branch' ? (
          <BranchForm value={form} onChange={updateForm} />
        ) : (
          <TemplateItem value={form} onChange={updateForm} />
        )}
      </Grid>

      {dialog}

      <Grid item xs={12}>
        <Box display="flex" flexWrap="wrap" sx={{ m: -0.5 }}>
          <Button sx={{ m: 0.5 }} variant="contained" onClick={submit}>
            {t('form.execute')}
          </Button>
          <Button
            sx={{ m: 0.5 }}
            variant="outlined"
            startIcon={<SaveOutlined />}
            disabled={!needSave}
            onClick={async () => {
              try {
                resetForm(await (form._id ? state.update(form._id, form) : state.create(form)));
                Toast.success(t('alert.saved'));
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            }}>
            {t('form.save')}
          </Button>
          <Button
            sx={{ m: 0.5 }}
            variant="outlined"
            startIcon={<Add />}
            disabled={formIsInitial}
            onClick={async () => {
              try {
                if (needSave) {
                  showDialog({
                    title: t('alert.discardChanges'),
                    content: <Box minWidth={300} />,
                    cancelText: t('alert.cancel'),
                    okText: t('alert.ok'),
                    onOk: () => resetForm(INIT_FORM),
                  });
                } else {
                  resetForm(INIT_FORM);
                }
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            }}>
            {t('form.new')}
          </Button>
          <Button
            sx={{ m: 0.5 }}
            startIcon={<CopyAll />}
            variant="outlined"
            disabled={formIsInitial || !form._id}
            onClick={() => {
              resetForm({ ...form, _id: '' });
            }}>
            {t('form.copy')}
          </Button>
          <Button
            sx={{ m: 0.5 }}
            startIcon={<ImportExport />}
            variant="outlined"
            disabled={!form._id}
            onClick={() => {
              const text = stringify(form);
              saveAs(new Blob([text]), `${form.name || form._id}.yml`);
            }}>
            {t('form.exportTemplate')}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

function TemplateItem({
  value,
  onChange,
}: {
  value: Pick<TemplateForm, 'name' | 'template' | 'parameters'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
}) {
  const { t } = useLocaleContext();

  const deferredTemplate = useDeferredValue(value.template);

  const params = useMemo(() => matchParams(deferredTemplate ?? ''), [deferredTemplate]);

  const [paramConfig, setParamConfig] = useState<{ anchorEl: HTMLElement; param: string }>();

  const parametersHistory = useRef<Record<string, Parameter>>({});

  useEffect(() => {
    onChange((template) => {
      template.parameters ??= {};
      for (const param of params) {
        const history = parametersHistory.current[param];
        template.parameters[param] ??= history ?? {};
      }
      for (const [key, val] of Object.entries(template.parameters)) {
        if (!params.includes(key)) {
          delete template.parameters[key];
          parametersHistory.current[key] = JSON.parse(JSON.stringify(val));
        }
      }
    });
  }, [params]);

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.template')}
          size="small"
          multiline
          minRows={2}
          maxRows={10}
          value={value.template}
          onChange={(e) => onChange((v) => (v.template = e.target.value))}
          helperText={<TokenCounter value={value.template ?? ''} />}
          FormHelperTextProps={{ sx: { textAlign: 'right', mt: 0 } }}
        />
      </Grid>
      {params.map((param) => {
        const parameter = value.parameters?.[param];
        if (!parameter) {
          return null;
        }

        return (
          <Grid item xs={12} key={param}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <ParameterField
                key={param}
                sx={{ flex: 1 }}
                size="small"
                label={parameter.label || param}
                parameter={parameter}
                helperText={
                  <Box component="span" sx={{ display: 'flex' }}>
                    <Box component="span" sx={{ flex: 1, overflow: 'hidden' }}>
                      {parameter.helper}
                    </Box>
                    <TokenCounter value={parameter} />
                  </Box>
                }
                value={parameter.value ?? parameter.defaultValue ?? ''}
                onChange={(value) => onChange((v) => (v.parameters![param]!.value = value))}
              />
              <IconButton
                sx={{ ml: 2, mt: 0.5 }}
                size="small"
                onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, param })}>
                <Settings fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        );
      })}

      <Popper
        open={Boolean(paramConfig)}
        modifiers={[
          {
            name: 'preventOverflow',
            enabled: true,
            options: {
              altAxis: true,
              altBoundary: true,
              tether: true,
              rootBoundary: 'document',
              padding: 8,
            },
          },
        ]}
        anchorEl={paramConfig?.anchorEl}
        placement="bottom-end"
        sx={{ zIndex: 1200 }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setParamConfig(undefined);
          }}>
          <Paper elevation={11} sx={{ p: 3, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            {paramConfig && (
              <ParameterConfig
                value={value.parameters![paramConfig.param]!}
                onChange={(parameter) => onChange((v) => (v.parameters![paramConfig.param] = parameter))}
              />
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Grid>
  );
}

function TemplateList({
  templates,
  current,
  remove,
  onCurrentChange,
}: {
  current?: TemplateForm;
  onCurrentChange?: (template?: Template) => void;
} & Pick<ReturnType<typeof useTemplates>, 'templates' | 'remove'>) {
  const { t } = useLocaleContext();

  const { popper, showPopper, closePopper } = usePopper();

  return (
    <>
      {popper}

      {templates.length === 0 && (
        <ListItemButton dense disabled>
          <ListItemText primary={t('alert.noTemplates')} primaryTypographyProps={{ textAlign: 'center' }} />
        </ListItemButton>
      )}

      {templates.map((item) => (
        <ListItem
          key={item._id}
          disablePadding
          secondaryAction={
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                showPopper({
                  anchorEl: e.currentTarget,
                  children: (
                    <Paper elevation={24}>
                      <DialogTitle>{t('alert.deleteTemplate')}</DialogTitle>
                      <DialogActions>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            closePopper();
                          }}>
                          {t('alert.cancel')}
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await remove(item._id);
                              closePopper();
                              if (current?._id === item._id) {
                                onCurrentChange?.(templates[0]);
                              }
                              Toast.success(t('alert.deleted'));
                            } catch (error) {
                              Toast.error(getErrorMessage(error));
                              throw error;
                            }
                          }}>
                          {t('alert.delete')}
                        </Button>
                      </DialogActions>
                    </Paper>
                  ),
                });
              }}>
              <Delete fontSize="small" />
            </IconButton>
          }>
          <ListItemButton selected={current?._id === item._id} onClick={() => onCurrentChange?.(item)} dense>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Icon icon={item.icon || 'bi:x-diamond'} />
            </ListItemIcon>
            <ListItemText
              primary={item.name || item._id}
              secondary={item.description || item.template}
              primaryTypographyProps={{
                noWrap: true,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              secondaryTypographyProps={{
                noWrap: true,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            />
          </ListItemButton>
        </ListItem>
      ))}
    </>
  );
}

export const matchParams = (template: string) => [
  ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
];

function useTemplates() {
  const state = useReactive<{ templates: Template[]; loading: boolean; submiting: boolean; error?: Error }>({
    templates: [],
    loading: false,
    submiting: false,
  });

  const refetch = useCallback(async () => {
    state.loading = true;
    try {
      const res = await getTemplates({ limit: 100, sort: '-updatedAt' });
      state.templates.splice(0, state.templates.length, ...res.templates);
    } catch (error) {
      state.error = error;
      throw error;
    } finally {
      state.loading = false;
    }
  }, []);

  useEffect(() => {
    refetch();
  }, []);

  const create = useCallback(async (template: TemplateInput) => {
    state.submiting = true;
    try {
      const res = await createTemplate(template);
      await refetch();
      return res;
    } finally {
      state.submiting = false;
    }
  }, []);

  const update = useCallback(async (templateId: string, template: TemplateInput) => {
    state.submiting = true;
    try {
      const res = await updateTemplate(templateId, template);
      await refetch();
      return res;
    } finally {
      state.submiting = false;
    }
  }, []);

  const remove = useCallback(async (templateId: string) => {
    state.submiting = true;
    try {
      const res = await deleteTemplate(templateId);
      await refetch();
      return res;
    } finally {
      state.submiting = false;
    }
  }, []);

  return { ...state, refetch, create, update, remove };
}

function TokenCounter({ value }: { value: string | Parameter }) {
  const deferred = useDeferredValue(value);
  const count = useMemo(
    () => encode(typeof deferred === 'string' ? deferred : parameterToStringValue(deferred)).length,
    [deferred]
  );
  return <Box component="span">{count} tokens</Box>;
}

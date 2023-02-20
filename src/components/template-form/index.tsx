import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import { ArrowDropDown, CopyAll, Delete, Settings } from '@mui/icons-material';
import {
  Box,
  Button,
  DialogActions,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  TextFieldProps,
} from '@mui/material';
import { useReactive } from 'ahooks';
import Joi from 'joi';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getErrorMessage } from '../../libs/api';
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../../libs/templates';
import useMenu from '../../utils/use-menu';
import usePopper from '../../utils/use-popper';
import ParameterConfig, { NumberField } from './parameter-config';

export interface Template {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
  template: string;
  parameters: { [key: string]: Parameter };
}

export type ParameterType = 'number' | 'string';

export type Parameter = {
  type?: ParameterType;
  value?: any;
  label?: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  [key: string]: any;
};

const INIT_FORM: Template = {
  _id: '',
  name: '',
  icon: '',
  description: undefined,
  template: '',
  parameters: {},
};

export default function TemplateForm({ onExecute }: { onExecute?: (template: Template) => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');
  const state = useTemplates();
  const { menu, showMenu } = useMenu();

  const form = useReactive({ ...INIT_FORM });

  const setForm = useCallback((template?: Template) => {
    Object.assign(form, { ...INIT_FORM }, template && JSON.parse(JSON.stringify(template)));
    setSearchParams((prev) => {
      if (template?._id) prev.set('templateId', template._id);
      else prev.delete('templateId');
      return prev;
    });
  }, []);

  const deferredTemplate = useDeferredValue(form.template);

  const params = useMemo(() => matchParams(deferredTemplate), [deferredTemplate]);

  useEffect(() => {
    for (const param of params) {
      if (!form.parameters[param]) {
        form.parameters[param] = {};
      }
    }
  }, [params]);

  const [error, setError] = useState<Joi.ValidationError>();

  const submit = () => {
    const getValueSchema = (parameter: Parameter) => {
      return {
        number: () => {
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
        string: () => {
          let s = Joi.string();
          if (parameter.required) {
            s = s.required();
          }
          if (typeof parameter.minLength === 'number') {
            s = s.min(parameter.minLength);
          }
          if (typeof parameter.maxLength === 'number') {
            s = s.max(parameter.maxLength);
          }
          return s;
        },
      }[parameter.type || 'string']();
    };

    const schema = Joi.object(
      Object.fromEntries(
        params.map((param) => {
          const parameter = form.parameters[param];
          return [param, parameter ? getValueSchema(parameter) : undefined];
        })
      )
    );

    setError(undefined);
    const { error, value } = schema.validate(
      Object.fromEntries(Object.entries(form.parameters).map(([key, { value }]) => [key, value])),
      { allowUnknown: true }
    );
    if (error) {
      setError(error);
      return;
    }
    onExecute?.(JSON.parse(JSON.stringify({ ...form, parameters: value })));
  };

  useEffect(() => {
    const template = state.templates.find((i) => i._id === templateId) ?? state.templates.at(0);
    if (template && template._id !== form._id) setForm(template);
  }, [state.templates.length, templateId]);

  const { popper, showPopper } = usePopper();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Name"
          size="small"
          value={form.name}
          onChange={(e) => (form.name = e.target.value)}
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
                      children: <TemplateList {...state} current={form} onCurrentChange={setForm} />,
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
        <TextField
          fullWidth
          label="Icon"
          size="small"
          value={form.icon || ''}
          onChange={(e) => (form.icon = e.target.value)}
          InputProps={{
            startAdornment: form.icon && (
              <InputAdornment position="start">
                <Icon icon={form.icon} />
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Description"
          size="small"
          value={form.description || ''}
          onChange={(e) => (form.description = e.target.value)}
          multiline
          minRows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Template"
          size="small"
          multiline
          minRows={2}
          value={form.template}
          onChange={(e) => (form.template = e.target.value)}
        />
      </Grid>
      {params.map((param) => {
        const parameter = form.parameters[param];
        if (!parameter) {
          return null;
        }

        const err = error?.details.find((i) => i.path[0] === param);

        return (
          <Grid item xs={12} key={param}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <ParameterRenderer
                key={`${form._id}-${param}`}
                sx={{ flex: 1 }}
                size="small"
                label={parameter.label || param}
                parameter={parameter}
                error={!!err}
                helperText={err?.message ?? parameter.helper}
              />
              <IconButton
                sx={{ ml: 2, mt: 0.5 }}
                size="small"
                onClick={(e) =>
                  showPopper({
                    anchorEl: e.currentTarget.parentElement,
                    placement: 'bottom-end',
                    children: (
                      <Paper elevation={11} sx={{ p: 3, maxWidth: 320 }}>
                        <ParameterConfig value={parameter} />
                      </Paper>
                    ),
                  })
                }>
                <Settings fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        );
      })}
      {popper}
      <Grid item xs={12} lg={3}>
        <Button fullWidth sx={{ flex: 1 }} variant="contained" onClick={submit}>
          Execute
        </Button>
      </Grid>
      <Grid item xs={12} lg>
        <Box display="flex">
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                setForm(await (form._id ? state.update(form._id, form) : state.create(form)));
                Toast.success('Saved');
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            }}>
            Save
          </Button>
          <Button
            variant="outlined"
            sx={{ mx: 1 }}
            onClick={async () => {
              try {
                setForm(await state.create(form));
                Toast.success('Saved');
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            }}>
            Save As New
          </Button>
          <Button
            startIcon={<CopyAll />}
            variant="outlined"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify({ ...form }));
              Toast.success('Copied');
            }}>
            Copy
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

function TemplateList({
  templates,
  current,
  remove,
  onCurrentChange,
}: {
  current?: Template;
  onCurrentChange?: (template?: Template) => void;
} & Pick<ReturnType<typeof useTemplates>, 'templates' | 'remove'>) {
  const { popper, showPopper, closePopper } = usePopper();

  return (
    <>
      {popper}

      {templates.length === 0 && (
        <ListItemButton dense disabled>
          <ListItemText primary="No Templates" primaryTypographyProps={{ textAlign: 'center' }} />
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
                      <DialogTitle>Delete this template?</DialogTitle>
                      <DialogActions>
                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            closePopper();
                          }}>
                          Cancel
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
                              Toast.success('Deleted');
                            } catch (error) {
                              Toast.error(getErrorMessage(error));
                              throw error;
                            }
                          }}>
                          Delete
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

function ParameterRenderer({ parameter, ...props }: { parameter: Parameter } & Omit<TextFieldProps, 'onChange'>) {
  const Field = {
    number: NumberParameterField,
    string: StringParameterField,
  }[parameter.type || 'string'];

  return <Field parameter={parameter} {...props} />;
}

function NumberParameterField({ parameter, ...props }: { parameter: Parameter } & Omit<TextFieldProps, 'onChange'>) {
  return (
    <NumberField
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      min={parameter.min}
      max={parameter.max}
      value={parameter.value ?? ''}
      onChange={(val) => (parameter.value = val)}
      {...props}
    />
  );
}

function StringParameterField({ parameter, ...props }: { parameter: Parameter } & Omit<TextFieldProps, 'onChange'>) {
  const multiline = parameter?.type === 'string' && parameter.multiline;

  return (
    <TextField
      required={parameter.required}
      label={parameter.label}
      placeholder={parameter.placeholder}
      helperText={parameter.helper}
      value={parameter.value ?? ''}
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      onChange={(e) => (parameter.value = e.target.value)}
      inputProps={{ maxLength: parameter.maxLength }}
      {...props}
    />
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

  const create = useCallback(async (template: Template) => {
    state.submiting = true;
    try {
      const res = await createTemplate(template);
      await refetch();
      return res;
    } finally {
      state.submiting = false;
    }
  }, []);

  const update = useCallback(async (templateId: string, template: Template) => {
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

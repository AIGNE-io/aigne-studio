import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import { ArrowDropDown, CopyAll, Delete } from '@mui/icons-material';
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
  MenuItem,
  Paper,
  TextField,
  TextFieldProps,
} from '@mui/material';
import { useReactive } from 'ahooks';
import { useCallback, useDeferredValue, useEffect, useMemo } from 'react';

import { getErrorMessage } from '../../libs/api';
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../../libs/templates';
import useMenu from '../../utils/use-menu';
import usePopper from '../../utils/use-popper';

export interface Template {
  _id: string;
  name: string;
  icon?: string;
  description?: string;
  template: string;
  parameters: { [key: string]: Parameter };
}

export type ParameterType = 'number' | 'string';

export type Parameter = { type?: ParameterType; value?: any; [key: string]: any };

const INIT_FORM: Template = {
  _id: '',
  name: '',
  icon: '',
  description: undefined,
  template: '',
  parameters: {},
};

export default function TemplateForm({ onExecute }: { onExecute?: (template: Template) => void }) {
  const templates = useTemplates();
  const { menu, showMenu } = useMenu();

  const form = useReactive({ ...INIT_FORM });

  const setForm = useCallback(
    (template?: Template) => Object.assign(form, { ...INIT_FORM }, JSON.parse(JSON.stringify(template))),
    []
  );

  const deferredTemplate = useDeferredValue(form.template);

  const params = useMemo(() => matchParams(deferredTemplate), [deferredTemplate]);

  const submit = () => onExecute?.(form);

  useEffect(() => {
    const last = templates.templates.at(0);
    if (last) setForm(last);
  }, [templates.templates.length]);

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
                      children: <TemplateList {...templates} current={form} onCurrentChange={setForm} />,
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
      {params.map((param) => (
        <Grid item xs={12} key={param}>
          <Box display="flex" justifyContent="space-between">
            <ParameterRenderer
              key={`${form._id}-${param}`}
              sx={{ flex: 1, mr: 2 }}
              size="small"
              label={param}
              parameter={form.parameters[param]}
              value={form.parameters[param]?.value}
              onChange={(value) => (form.parameters[param] = { ...form.parameters[param], value })}
            />
            <ParameterTypeSelect
              key={`${form._id}-${param}-type`}
              inputProps={{ tabIndex: -1 }}
              value={form.parameters[param]}
              onChange={(value) => (form.parameters[param] = { ...value })}
            />
          </Box>
        </Grid>
      ))}
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
                setForm(await (form._id ? templates.update(form._id, form) : templates.create(form)));
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
                setForm(await templates.create(form));
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

const PARAMETER_SELECT_MAP: { [key in ParameterType]: (value: Parameter) => string } = {
  number: () => 'number',
  string: (value) => (value.multiline ? 'long-text' : 'text'),
};

const PARAMETER_SELECT_VALUE_MAP: { [key: string]: Parameter } = {
  text: { type: 'string' },
  'long-text': { type: 'string', multiline: true },
  number: { type: 'number' },
};

function ParameterTypeSelect({
  value,
  onChange,
  ...props
}: { value?: Parameter; onChange: (value?: Parameter) => void } & Omit<TextFieldProps, 'value' | 'onChange'>) {
  const v = value?.type ? PARAMETER_SELECT_MAP[value.type](value) : 'text';

  return (
    <TextField
      {...props}
      sx={{ width: 130 }}
      size="small"
      select
      value={v}
      onChange={(e) => onChange(PARAMETER_SELECT_VALUE_MAP[e.target.value])}>
      <MenuItem value="text">Short Text</MenuItem>
      <MenuItem value="long-text">Long Text</MenuItem>
      <MenuItem value="number">Number</MenuItem>
    </TextField>
  );
}

function ParameterRenderer({
  parameter,
  value,
  onChange,
  ...props
}: { parameter?: Parameter; value?: string; onChange?: (value: string) => void } & Omit<TextFieldProps, 'onChange'>) {
  const multiline = parameter?.type === 'string' && parameter.multiline;

  return (
    <TextField
      {...props}
      inputProps={
        parameter?.type === 'number'
          ? {
              type: 'number',
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }
          : undefined
      }
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

export const matchParams = (template: string) => [
  ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
];

function useTemplates() {
  const templates = useReactive<{ templates: Template[]; loading: boolean; submiting: boolean; error?: Error }>({
    templates: [],
    loading: false,
    submiting: false,
  });

  const refetch = useCallback(async () => {
    templates.loading = true;
    try {
      const res = await getTemplates();
      templates.templates.splice(0, templates.templates.length, ...res.templates);
    } catch (error) {
      templates.error = error;
      throw error;
    } finally {
      templates.loading = false;
    }
  }, []);

  useEffect(() => {
    refetch();
  }, []);

  const create = useCallback(async (template: Template) => {
    templates.submiting = true;
    try {
      const res = await createTemplate(template);
      await refetch();
      return res;
    } finally {
      templates.submiting = false;
    }
  }, []);

  const update = useCallback(async (templateId: string, template: Template) => {
    templates.submiting = true;
    try {
      const res = await updateTemplate(templateId, template);
      await refetch();
      return res;
    } finally {
      templates.submiting = false;
    }
  }, []);

  const remove = useCallback(async (templateId: string) => {
    templates.submiting = true;
    try {
      const res = await deleteTemplate(templateId);
      await refetch();
      return res;
    } finally {
      templates.submiting = false;
    }
  }, []);

  return { ...templates, refetch, create, update, remove };
}

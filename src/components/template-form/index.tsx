import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import { Settings, TravelExplore } from '@mui/icons-material';
import {
  Box,
  Button,
  ClickAwayListener,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import Joi from 'joi';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  HoroscopeParameter,
  LanguageParameter,
  NumberParameter,
  Parameter,
  SelectParameter,
  StringParameter,
  Template,
} from '../../../api/src/store/templates';
import encode from '../../libs/encode';
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

export default function TemplateFormView({
  value: form,
  onChange,
  onExecute,
}: {
  value: Template;
  onChange: (update: Template | ((update: WritableDraft<Template>) => void)) => void;
  onExecute?: (template: Template) => void;
}) {
  const { t } = useLocaleContext();

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

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <FormLabel sx={{ mr: 2 }}>{t('form.mode')}</FormLabel>
          <RadioGroup
            row
            value={form.mode ?? 'default'}
            onChange={(_, value) => onChange((f) => (f.mode = value as any))}>
            <FormControlLabel value="default" control={<Radio />} label={t('form.default')} />
            <FormControlLabel value="chat" control={<Radio />} label={t('form.chat')} />
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.name')}
          size="small"
          value={form.name}
          onChange={(e) => onChange((form) => (form.name = e.target.value))}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          select
          fullWidth
          label={t('form.type')}
          size="small"
          value={form.type ?? 'prompt'}
          onChange={(e) =>
            onChange((form) => {
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
          onChange={(e) => onChange((form) => (form.icon = e.target.value))}
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
          onChange={(e) => onChange((form) => (form.description = e.target.value))}
          multiline
          minRows={2}
        />
      </Grid>
      <Grid item xs={12}>
        <TagsAutoComplete value={form.tags ?? []} onChange={(_, value) => onChange((form) => (form.tags = value))} />
      </Grid>

      <Grid item xs={12}>
        {form.type === 'branch' ? (
          <BranchForm value={form} onChange={onChange} />
        ) : (
          <TemplateItem value={form} onChange={onChange} />
        )}
      </Grid>

      <Grid item xs={12}>
        <Button fullWidth variant="contained" onClick={submit}>
          {t('form.execute')}
        </Button>
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
      if (!template.parameters && params.length === 0) {
        return;
      }

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
          value={value.template ?? ''}
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

export const matchParams = (template: string) => [
  ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
];

function TokenCounter({ value }: { value: string | Parameter }) {
  const deferred = useDeferredValue(value);
  const count = useMemo(
    () => encode(typeof deferred === 'string' ? deferred : parameterToStringValue(deferred)).length,
    [deferred]
  );
  return <Box component="span">{count} tokens</Box>;
}

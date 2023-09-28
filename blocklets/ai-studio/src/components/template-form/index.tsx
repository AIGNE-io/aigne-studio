import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { ArrowDropDown, TravelExplore } from '@mui/icons-material';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import Joi from 'joi';
import omit from 'lodash/omit';
import { ComponentProps, useState } from 'react';
import { useAsync } from 'react-use';
import type { Map } from 'yjs';

import { TemplateYjs } from '../../../api/src/store/projects';
import {
  HoroscopeParameter,
  LanguageParameter,
  NumberParameter,
  Parameter,
  SelectParameter,
  StringParameter,
  Template,
} from '../../../api/src/store/templates';
import { Commit, getLogs } from '../../libs/log';
import { getFile } from '../../libs/tree';
import { useProjectState } from '../../pages/project/state';
import useDialog from '../../utils/use-dialog';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import Branches from './branches';
import CommitSelect from './commit-select';
import CommitsTip from './commits-tip';
import Datasets from './datasets';
import Next from './next';
import Parameters, { matchParams } from './parameters';
import Prompts from './prompts';
import TagsAutoComplete from './tags-autocomplete';

const MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k-0613'];

export type TemplateForm = Pick<
  Template,
  | 'id'
  | 'mode'
  | 'type'
  | 'name'
  | 'icon'
  | 'tags'
  | 'description'
  | 'prompts'
  | 'branch'
  | 'parameters'
  | 'datasets'
  | 'next'
>;

export default function TemplateFormView({
  projectId,
  _ref: ref,
  path,
  hash,
  value: form,
  onExecute,
  onTemplateClick,
}: {
  projectId: string;
  _ref: string;
  path: string;
  hash?: string;
  value: TemplateYjs;
  onExecute?: (template: TemplateYjs) => void;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { t, locale } = useLocaleContext();

  const { dialog, showDialog, closeDialog } = useDialog();

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

    const params =
      (form.prompts && Object.values(form.prompts).flatMap((i) => matchParams(i.data.content ?? ''))) ?? [];

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

  const onCommitSelect = async (commit: Commit) => {
    const template = await getFile({ projectId, ref: commit.oid, path });
    const templateYjs: TemplateYjs = {
      ...omit(template, 'path'),
      prompts:
        template.prompts &&
        Object.fromEntries(
          template.prompts?.map((prompt, index) => [
            prompt.id,
            {
              index,
              data: prompt,
            },
          ])
        ),
      branch: template.branch && {
        branches: Object.fromEntries(
          template.branch.branches.map((branch, index) => [branch.id, { index, data: branch }])
        ),
      },
      datasets:
        template.datasets &&
        Object.fromEntries(template.datasets.map((dataset, index) => [dataset.id, { index, data: dataset }])),
    };

    const map: Map<any> = getYjsValue(form) as any;
    map.doc!.transact(() => {
      map.clear();
      Object.assign(form, templateYjs);
    });

    closeDialog();
  };

  return (
    <Grid container spacing={2}>
      {dialog}

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography color="text.secondary" component="span">
            {t('alert.updatedAt')}:
          </Typography>

          <Commits
            key={form.updatedAt}
            projectId={projectId}
            _ref={ref}
            path={path}
            hash={hash}
            onCommitSelect={onCommitSelect}>
            <Button
              sx={{ ml: 1 }}
              color="inherit"
              endIcon={<ArrowDropDown fontSize="small" sx={{ color: 'text.secondary' }} />}>
              <RelativeTime locale={locale} value={form.updatedAt} />
            </Button>
          </Commits>

          <Box flex={1} />

          <Button
            onClick={() =>
              showDialog({
                maxWidth: 'sm',
                fullWidth: true,
                title: t('alert.pickFromBranch'),
                content: <CommitSelect projectId={projectId} _ref={ref} path={path} onSelect={onCommitSelect} />,
                cancelText: t('alert.cancel'),
              })
            }>
            {t('alert.pickFromBranch')}
          </Button>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <FormControl size="small" fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <FormLabel sx={{ width: 60 }}>{t('form.mode')}</FormLabel>
          <RadioGroup row value={form.mode ?? 'default'} onChange={(_, value) => (form.mode = value as any)}>
            <FormControlLabel value="default" control={<Radio />} label={t('form.form')} />
            <FormControlLabel value="chat" control={<Radio />} label={t('form.chat')} />
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid mt={-1} item xs={12}>
        <FormControl size="small" fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <FormLabel sx={{ width: 60 }}>{t('form.type')}</FormLabel>
          <RadioGroup
            row
            value={form.type ?? 'prompt'}
            onChange={(_, type) => {
              if (type === 'prompt') {
                delete form.type;
              } else {
                form.type = type as any;
              }
            }}>
            <FormControlLabel value="prompt" control={<Radio />} label={t('form.prompt')} />
            <FormControlLabel value="branch" control={<Radio />} label={t('form.branch')} />
            <FormControlLabel value="image" control={<Radio />} label={t('form.image')} />
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid item xs={12} position="relative">
        <WithAwareness path={[form.id, 'name']}>
          <TextField
            fullWidth
            label={t('form.name')}
            size="small"
            value={form.name ?? ''}
            onChange={(e) => (form.name = e.target.value)}
          />
        </WithAwareness>

        <AwarenessIndicator path={[form.id, 'name']} sx={{ position: 'absolute', right: -16, top: 16 }} />
      </Grid>
      {form.type !== 'image' && (
        <>
          <Grid item xs={6} position="relative">
            <WithAwareness path={[form.id, 'model']}>
              <TextField
                fullWidth
                label={t('form.model')}
                size="small"
                value={form.model ?? ''}
                select
                onChange={(e) => (form.model = e.target.value)}>
                {MODELS.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))}
              </TextField>
            </WithAwareness>

            <AwarenessIndicator path={[form.id, 'model']} sx={{ position: 'absolute', right: -16, top: 16 }} />
          </Grid>

          <Grid item xs={6} position="relative">
            <WithAwareness path={[form.id, 'temperature']}>
              <TextField
                size="small"
                fullWidth
                label={t('form.temperature')}
                inputProps={{ type: 'number', min: 0, max: 2, step: 0.1 }}
                value={form.temperature ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) {
                    form.temperature = undefined;
                  } else {
                    const n = Math.max(Math.min(2, Number(v)), 0);
                    form.temperature = n;
                  }
                }}
              />
            </WithAwareness>

            <AwarenessIndicator path={[form.id, 'temperature']} sx={{ position: 'absolute', right: -16, top: 16 }} />
          </Grid>
        </>
      )}
      <Grid item xs={12} position="relative">
        <WithAwareness path={[form.id, 'icon']}>
          <TextField
            fullWidth
            label={t('form.icon')}
            size="small"
            value={form.icon ?? ''}
            onChange={(e) => (form.icon = e.target.value)}
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
        </WithAwareness>

        <AwarenessIndicator path={[form.id, 'icon']} sx={{ position: 'absolute', right: -16, top: 16 }} />
      </Grid>

      <Grid item xs={12} position="relative">
        <WithAwareness path={[form.id, 'description']}>
          <TextField
            fullWidth
            label={t('form.description')}
            size="small"
            value={form.description ?? ''}
            onChange={(e) => (form.description = e.target.value)}
            multiline
            minRows={2}
          />
        </WithAwareness>

        <AwarenessIndicator path={[form.id, 'description']} sx={{ position: 'absolute', right: -16, top: 16 }} />
      </Grid>

      <Grid item xs={12}>
        <TagsAutoComplete
          projectId={projectId}
          label={t('form.tag')}
          value={form.tags ?? []}
          onChange={(_, value) => (form.tags = value)}
        />
      </Grid>

      <Grid item xs={12}>
        <Prompts value={form} />
      </Grid>

      {form.type === 'branch' && (
        <Grid item xs={12}>
          <Branches form={form} onTemplateClick={onTemplateClick} />
        </Grid>
      )}

      <Grid item xs={12}>
        <Datasets form={form} />
      </Grid>

      <Grid item xs={12}>
        <Parameters form={form} />
      </Grid>

      {form.type !== 'image' && (
        <Grid item xs={12}>
          <Next form={form} onTemplateClick={onTemplateClick} />
        </Grid>
      )}

      <Grid item xs={12} sx={{ position: 'sticky', bottom: 0, zIndex: 1 }}>
        <Button fullWidth variant="contained" onClick={submit}>
          {t('form.execute')}
        </Button>
      </Grid>
    </Grid>
  );
}

function Commits({
  projectId,
  _ref: ref,
  path,
  ...props
}: {
  projectId: string;
  _ref: string;
  path?: string;
} & Omit<ComponentProps<typeof CommitsTip>, 'commits' | 'loading'>) {
  const { state } = useProjectState(projectId, ref);

  const { value, loading, error } = useAsync(() => getLogs({ projectId, ref, path }), [path, state.commits[0]?.oid]);
  if (error) console.error(error);

  return <CommitsTip {...props} loading={loading} commits={value?.commits} />;
}

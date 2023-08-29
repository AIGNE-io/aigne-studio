import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import { TravelExplore } from '@mui/icons-material';
import {
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
} from '@mui/material';
import { Draft } from 'immer';

import { Template } from '../../../api/src/store/templates';
import TagsAutoComplete from './tags-autocomplete';

const MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo-16k-0613'];

export default function TemplateSettings({
  projectId,
  value: form,
  onChange,
}: {
  projectId: string;
  value: Template;
  onChange: (update: Template | ((update: Draft<Template>) => void)) => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl size="small" fullWidth sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <FormLabel sx={{ width: 60 }}>{t('form.mode')}</FormLabel>
          <RadioGroup
            row
            value={form.mode ?? 'default'}
            onChange={(_, value) => onChange((f) => (f.mode = value as any))}>
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
            onChange={(_, type) =>
              onChange((form) => {
                if (type === 'prompt') {
                  delete form.type;
                } else {
                  form.type = type as any;
                }
              })
            }>
            <FormControlLabel value="prompt" control={<Radio />} label={t('form.prompt')} />
            <FormControlLabel value="branch" control={<Radio />} label={t('form.branch')} />
            <FormControlLabel value="image" control={<Radio />} label={t('form.image')} />
          </RadioGroup>
        </FormControl>
      </Grid>

      {form.type !== 'image' && (
        <>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label={t('form.model')}
              size="small"
              value={form.model ?? ''}
              select
              onChange={(e) => onChange((form) => (form.model = e.target.value))}>
              {MODELS.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              size="small"
              fullWidth
              label={t('form.temperature')}
              inputProps={{ type: 'number', min: 0, max: 2, step: 0.1 }}
              value={form.temperature ?? ''}
              onChange={(e) =>
                onChange((f) => {
                  const v = e.target.value;
                  if (!v) {
                    f.temperature = undefined;
                  } else {
                    const n = Math.max(Math.min(2, Number(v)), 0);
                    f.temperature = n;
                  }
                })
              }
            />
          </Grid>
        </>
      )}

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
        <TagsAutoComplete
          projectId={projectId}
          label={t('form.tag')}
          value={form.tags ?? []}
          onChange={(_, value) => onChange((form) => (form.tags = value))}
        />
      </Grid>
    </Grid>
  );
}

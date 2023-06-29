import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import { ArrowDropDown, TravelExplore } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Tooltip as MuiTooltip,
  Radio,
  RadioGroup,
  TextField,
  TooltipProps,
  Typography,
  alpha,
  listItemButtonClasses,
  listItemTextClasses,
  styled,
  tooltipClasses,
} from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import Joi from 'joi';
import { ReactElement, cloneElement, useState } from 'react';
import { useAsync } from 'react-use';

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
import { Commit, getTemplate, getTemplateCommits } from '../../libs/templates';
import Avatar from '../avatar';
import Branches from './branches';
import Datasets from './datasets';
import Next from './next';
import Parameters, { matchParams } from './parameters';
import Prompts from './prompts';
import TagsAutoComplete from './tags-autocomplete';

const MODELS = ['gpt-3.5-turbo', 'gpt-3.5-turbo-0301'];

export type TemplateForm = Pick<
  Template,
  | '_id'
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
  value: form,
  onChange,
  onExecute,
  onTemplateClick,
}: {
  value: Template;
  onChange: (update: Template | ((update: WritableDraft<Template>) => void)) => void;
  onExecute?: (template: Template) => void;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { t, locale } = useLocaleContext();

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

    const params = form.prompts?.flatMap((i) => matchParams(i.content ?? '')) ?? [];

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
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography color="text.secondary" component="span">
            {t('alert.updatedAt')}:
          </Typography>

          <CommitsTip
            key={form.updatedAt}
            templateId={form._id}
            updatedAt={form.updatedAt}
            onCommitClick={async (commit) => {
              try {
                const template = await getTemplate(form._id, { hash: commit.hash });
                onChange(template);
              } catch (error) {
                Toast.error(getErrorMessage(error));
                throw error;
              }
            }}>
            <Button
              sx={{ ml: 1 }}
              color="inherit"
              endIcon={<ArrowDropDown fontSize="small" sx={{ color: 'text.secondary' }} />}>
              <RelativeTime locale={locale} value={form.updatedAt} />
            </Button>
          </CommitsTip>
        </Box>
      </Grid>

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
      <Grid item xs={12}>
        <TextField
          fullWidth
          label={t('form.name')}
          size="small"
          value={form.name ?? ''}
          onChange={(e) => onChange((form) => (form.name = e.target.value))}
        />
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
          label={t('form.tag')}
          value={form.tags ?? []}
          onChange={(_, value) => onChange((form) => (form.tags = value))}
        />
      </Grid>

      <Grid item xs={12}>
        <Prompts value={form} onChange={onChange} />
      </Grid>

      {form.type === 'branch' && (
        <Grid item xs={12}>
          <Branches value={form} onChange={onChange} onTemplateClick={onTemplateClick} />
        </Grid>
      )}

      <Grid item xs={12}>
        <Datasets value={form} onChange={onChange} />
      </Grid>

      <Grid item xs={12}>
        <Parameters value={form} onChange={onChange} />
      </Grid>

      {form.type !== 'image' && (
        <Grid item xs={12}>
          <Next value={form} onChange={onChange} onTemplateClick={onTemplateClick} />
        </Grid>
      )}

      <Grid item xs={12}>
        <Button fullWidth variant="contained" onClick={submit}>
          {t('form.execute')}
        </Button>
      </Grid>
    </Grid>
  );
}

function CommitsTip({
  templateId,
  updatedAt,
  children,
  onCommitClick,
}: {
  templateId: string;
  updatedAt: string;
  children: ReactElement;
  onCommitClick: (commit: Commit) => any;
}) {
  const { t, locale } = useLocaleContext();

  const [open, setOpen] = useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  const { value, loading, error } = useAsync(() => getTemplateCommits(templateId), [templateId]);
  if (error) throw error;

  const [loadingItemHash, setLoadingItemHash] = useState<string>();

  return (
    <ClickAwayListener onClickAway={handleTooltipClose}>
      <div>
        <Tooltip
          PopperProps={{
            disablePortal: true,
          }}
          onClose={handleTooltipClose}
          open={open}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          sx={{
            [`.${tooltipClasses.tooltip}`]: {
              minWidth: 200,
            },
          }}
          title={
            <List disablePadding dense>
              {value?.commits.map((commit) => (
                <ListItem disablePadding key={commit.hash}>
                  <ListItemButton
                    selected={updatedAt === commit.message}
                    onClick={async () => {
                      try {
                        setLoadingItemHash(commit.hash);
                        await onCommitClick(commit);
                        handleTooltipClose();
                      } finally {
                        setLoadingItemHash(undefined);
                      }
                    }}>
                    <ListItemIcon>
                      <Box component={Avatar} src={commit.author.avatar} did={commit.author.did} variant="circle" />
                    </ListItemIcon>
                    <ListItemText
                      primary={<RelativeTime locale={locale} value={commit.author.date.seconds * 1000} />}
                      primaryTypographyProps={{ noWrap: true }}
                    />
                    <Box width={20} ml={1} display="flex" alignItems="center">
                      {loadingItemHash === commit.hash && <CircularProgress size={16} />}
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
              {loading ? (
                <ListItem sx={{ display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={20} />
                </ListItem>
              ) : (
                !value?.commits.length && (
                  <ListItem>
                    <ListItemText primary={t('alert.noCommits')} primaryTypographyProps={{ textAlign: 'center' }} />
                  </ListItem>
                )
              )}
            </List>
          }>
          {cloneElement(children, { onClick: handleTooltipOpen })}
        </Tooltip>
      </div>
    </ClickAwayListener>
  );
}

const Tooltip = styled(({ className, ...props }: TooltipProps) => (
  <MuiTooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[1],
    borderRadius: 6,
    padding: 4,
  },

  [`.${listItemButtonClasses.root}`]: {
    borderRadius: 6,

    [`.${listItemTextClasses.primary}`]: {
      fontSize: 16,
    },

    '&.active': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    },
  },
}));

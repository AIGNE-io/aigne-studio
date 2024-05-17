import { getProjectIconUrl } from '@app/libs/project';
import { useAgents } from '@app/store/agent';
import DID from '@arcblock/ux/lib/DID';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import {
  Autocomplete,
  AutocompleteProps,
  Avatar,
  Box,
  Chip,
  Divider,
  List,
  ListItemText,
  ListSubheader,
  ListSubheaderProps,
  MenuItem,
  Stack,
  TextField,
  Typography,
  chipClasses,
} from '@mui/material';

export interface AgentSelectValue {
  blockletDid?: string;
  projectId?: string;
  id: string;
}

export type AgentSelectOption = ReturnType<typeof useAgents>['agents'][number];

export default function AgentSelect<
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
>({
  value,
  onChange,
  ...props
}: Pick<AutocompleteProps<AgentSelectValue, Multiple, DisableClearable, false>, 'value' | 'onChange'> &
  Partial<
    Omit<AutocompleteProps<AgentSelectOption, Multiple, DisableClearable, false>, 'options' | 'value' | 'onChange'>
  >) {
  const { agents, agentMap, projectMap } = useAgents();

  // TODO: 需要考虑不同 project 中有相同 agent id
  const val = Array.isArray(value) ? value.map((i) => agentMap[i.id]) : value ? agentMap[value.id] : value ?? null;

  return (
    <Autocomplete
      value={val as any}
      onChange={(e, v, reason) =>
        onChange?.(
          e,
          (Array.isArray(v)
            ? v.map((i) => ({ id: i.id, projectId: i.project.id, blockletId: i.blocklet?.did }))
            : v
              ? { id: v.id, projectId: v.project.id, blockletId: v.blocklet?.did }
              : v) as any,
          reason
        )
      }
      options={agents}
      isOptionEqualToValue={(o, v) => o.id === v.id && o.project.id === v.project.id}
      renderInput={(params) => <TextField {...params} hiddenLabel autoFocus={props.autoFocus} />}
      getOptionKey={(o) => [o.project.id, o.id].join('/')}
      getOptionLabel={(o) => o.name || o.description || o.id}
      groupBy={(o) => o.project.id}
      ListboxProps={{ sx: { py: 0, '>li': { borderBottom: 1, borderColor: 'divider' } } }}
      renderGroup={(params) => {
        const project = projectMap[params.group];
        if (!project) return null;

        return (
          <li key={params.key}>
            <ProjectHeaderView project={project} />

            <List
              dense
              disablePadding
              sx={{
                pl: 7,
                '>hr': { my: '0 !important', borderColor: 'grey.100', ml: 1 },
                '>hr:last-of-type': { display: 'none' },
              }}>
              {params.children}
            </List>
          </li>
        );
      }}
      renderOption={(props, option) => (
        <>
          <MenuItem {...props}>
            <ListItemText
              primary={option.name}
              secondary={option.description}
              primaryTypographyProps={{ noWrap: true }}
              secondaryTypographyProps={{ noWrap: true }}
            />
          </MenuItem>

          <Divider />
        </>
      )}
      renderTags={(value) =>
        value.map((option) => (
          <Chip
            sx={{
              height: 'auto',
              width: '100%',
              overflow: 'hidden',
              m: 0.5,
              borderRadius: 1,
              [`.${chipClasses.label}`]: { display: 'flex', flex: 1 },
            }}
            label={
              <ListItemText
                primary={option.name}
                secondary={option.description}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
            }
          />
        ))
      }
      {...props}
    />
  );
}

function ProjectHeaderView({ project, ...props }: { project: AgentSelectOption['project'] } & ListSubheaderProps) {
  const { t, locale } = useLocaleContext();

  return (
    <ListSubheader component="div" {...props}>
      <Stack direction="row" alignItems="center" mt={2} gap={2}>
        <Avatar variant="rounded" src={getProjectIconUrl(project.id, project.updatedAt)} />

        <Stack flex={1} width={1}>
          <Typography variant="subtitle2" noWrap>
            {project.name || t('unnamed')}
          </Typography>
          {project.description && (
            <Typography variant="caption" noWrap>
              {project.description}
            </Typography>
          )}

          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {t('author')}{' '}
            <Box
              component={DID}
              did={project.createdBy}
              copyable={false}
              responsive
              sx={{ flex: 1, width: 1, maxWidth: 200 }}
            />
          </Typography>

          <Typography variant="caption">
            {t('updatedAt')} &nbsp;
            <RelativeTime locale={locale} value={project.updatedAt} />
          </Typography>
        </Stack>
      </Stack>
    </ListSubheader>
  );
}

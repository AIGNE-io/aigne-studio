import { useIsAdmin } from '@app/contexts/session';
import { getProjectIconUrl } from '@app/libs/project';
import { useAgents } from '@app/store/agent';
import DID from '@arcblock/ux/lib/DID';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import { AddComponent } from '@blocklet/ui-react';
import { Icon } from '@iconify-icon/react';
import BrandAppgalleryIcon from '@iconify-icons/tabler/brand-appgallery';
import {
  Autocomplete,
  AutocompleteProps,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItemText,
  ListSubheader,
  ListSubheaderProps,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  chipClasses,
} from '@mui/material';
import { useMemo, useRef } from 'react';

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
  excludes,
  value,
  onChange,
  ...props
}: {
  excludes?: string[];
} & Pick<AutocompleteProps<AgentSelectValue, Multiple, DisableClearable, false>, 'value' | 'onChange'> &
  Partial<
    Omit<AutocompleteProps<AgentSelectOption, Multiple, DisableClearable, false>, 'options' | 'value' | 'onChange'>
  >) {
  const { t } = useLocaleContext();
  const { agents, agentMap, projectMap, load } = useAgents();
  const isAdmin = useIsAdmin();

  const options = useMemo(() => {
    if (!excludes?.length) {
      return agents;
    }

    return agents.filter((i) => !excludes.includes(i.id));
  }, [agents, excludes]);

  // TODO: 需要考虑不同 project 中有相同 agent id
  const val = Array.isArray(value) ? value.map((i) => agentMap[i.id]) : value ? agentMap[value.id] : value ?? null;

  const addComponentRef = useRef<{ onClick?: () => void; loading?: boolean }>();

  return (
    <>
      <AddComponent
        componentDid={window.blocklet.appId}
        resourceDid="z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB"
        resourceType="tool"
        autoClose={false}
        render={({ onClick, loading }) => {
          addComponentRef.current = { onClick, loading };
          return <Box />;
        }}
        onClose={() => {}}
        onComplete={() => {}}
      />

      <Autocomplete
        onOpen={() => load()}
        value={val as any}
        onChange={(e, v, reason) =>
          onChange?.(
            e,
            (Array.isArray(v)
              ? v.map((i) => ({ id: i.id, projectId: i.project.id, blockletDid: i.blocklet?.did }))
              : v
                ? { id: v.id, projectId: v.project.id, blockletDid: v.blocklet?.did }
                : v) as any,
            reason
          )
        }
        options={options}
        isOptionEqualToValue={(o, v) => o.id === v.id && o.project.id === v.project.id}
        renderInput={(params) => (
          <Stack direction="row">
            <TextField {...params} hiddenLabel autoFocus={props.autoFocus} fullWidth />
          </Stack>
        )}
        getOptionKey={(o) => [o.project.id, o.id].join('/')}
        getOptionLabel={(o) => o.name || o.description || o.id}
        groupBy={(o) => o.project.id}
        ListboxProps={{ sx: { py: 0, '>li': { borderBottom: 1, borderColor: 'divider' } } }}
        noOptionsText={t('noAgents')}
        PaperComponent={({ children, ...props }) => (
          <Paper {...props}>
            {children}

            <Stack direction="row" alignItems="center" justifyContent="center">
              <Button
                disabled={!isAdmin}
                onMouseDown={addComponentRef.current?.onClick}
                startIcon={<Icon icon={BrandAppgalleryIcon} />}>
                {t('addMoreAgentTools')}
              </Button>

              {!isAdmin && (
                <Typography variant="caption" color="text.disabled">
                  {t('onlyAdminsAllowAddMoreAgents')}
                </Typography>
              )}
            </Stack>
          </Paper>
        )}
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
    </>
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

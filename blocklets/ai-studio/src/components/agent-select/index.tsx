import { useIsAdmin } from '@app/contexts/session';
import { getProjectIconUrl } from '@app/libs/project';
import { useAgents } from '@app/store/agent';
import DID from '@arcblock/ux/lib/DID';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { ResourceType } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { AddComponent } from '@blocklet/ui-react/lib/ComponentManager';
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
import React, { useRef } from 'react';

import { AgentSelectFilter, useAgentSelectOptions } from './use-agents';

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
  type,
  placeholder = undefined,
  excludes,
  value,
  onChange,
  ...props
}: { type: ResourceType; placeholder?: string } & AgentSelectFilter &
  Pick<AutocompleteProps<AgentSelectValue, Multiple, DisableClearable, false>, 'value' | 'onChange'> &
  Partial<
    Omit<AutocompleteProps<AgentSelectOption, Multiple, DisableClearable, false>, 'options' | 'value' | 'onChange'>
  >) {
  const { t } = useLocaleContext();
  const { agentMap, projectMap, load } = useAgents({ type });

  const { agents: options } = useAgentSelectOptions({ type, excludes });

  const isAdmin = useIsAdmin();

  let val: AgentSelectOption | AgentSelectOption[] | null = null;
  if (Array.isArray(value)) {
    val = value
      .map((i) => {
        const v = agentMap[i.id];
        return v?.identity.blockletDid === i.blockletDid && (!i.projectId || v?.project.id === i.projectId)
          ? v
          : undefined;
      })
      .filter(isNonNullable);
  } else if (value) {
    const v = agentMap[value.id];
    val =
      v && v?.identity.blockletDid === value.blockletDid && (!value.projectId || v?.project.id === value.projectId)
        ? v
        : null;
  }

  const addComponentRef = useRef<{ onClick?: () => void; loading?: boolean }>(undefined);

  return (
    <>
      <AddComponent
        componentDid={window.blocklet.appId}
        resourceDid={AIGNE_STUDIO_COMPONENT_DID}
        resourceType={type}
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
              ? v.map((i) => ({
                  id: i.id,
                  projectId: i.identity.blockletDid ? i.project.id : undefined,
                  blockletDid: i.identity.blockletDid,
                }))
              : v
                ? {
                    id: v.id,
                    projectId: v.identity.blockletDid ? v.project.id : undefined,
                    blockletDid: v.identity.blockletDid,
                  }
                : v) as any,
            reason
          )
        }
        options={options}
        slotProps={{
          popper: { placement: 'bottom-start', sx: { width: 'fit-content !important', maxWidth: 500 } },
          listbox: { sx: { py: 0, '>li': { borderBottom: 1, borderColor: 'divider' } } },
        }}
        isOptionEqualToValue={(o, v) =>
          o.id === v.id && o.project.id === v.project.id && o.identity.blockletDid === v.identity.blockletDid
        }
        renderInput={(params) => (
          <Stack direction="row">
            <TextField
              data-testid="agent-select-input"
              placeholder={placeholder}
              {...params}
              hiddenLabel
              autoFocus={props.autoFocus}
              fullWidth
            />
          </Stack>
        )}
        getOptionKey={(o) => [o.project.id, o.id].join('/')}
        getOptionLabel={(o) => o.name || o.description || o.id}
        groupBy={(o) => o.project.id}
        noOptionsText={t('noAgents')}
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
        renderOption={({ key, ...props }, option) => (
          <React.Fragment key={key}>
            <MenuItem {...props}>
              <ListItemText
                primary={option.name}
                secondary={option.description}
                slotProps={{
                  primary: { noWrap: true },
                  secondary: { noWrap: true },
                }}
              />
            </MenuItem>

            <Divider />
          </React.Fragment>
        )}
        renderTags={(value) =>
          value.map((option) => (
            <Chip
              key={option.id}
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
                  slotProps={{
                    primary: { noWrap: true },
                    secondary: { noWrap: true },
                  }}
                />
              }
            />
          ))
        }
        {...props}
        slots={{
          paper: ({ children, ...props }) => (
            <Paper {...props}>
              {children}

              <Stack
                direction="row"
                sx={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Button
                  disabled={!isAdmin}
                  onMouseDown={addComponentRef.current?.onClick}
                  startIcon={<Icon icon={BrandAppgalleryIcon} />}>
                  {t('installMoreAgent')}
                </Button>

                {!isAdmin && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.disabled',
                    }}>
                    {t('onlyAdminsAllowAddMoreAgents')}
                  </Typography>
                )}
              </Stack>
            </Paper>
          ),
        }}
      />
    </>
  );
}

function ProjectHeaderView({
  project,
  ...props
}: { project: AgentSelectOption['project'] & { blockletDid?: string } } & ListSubheaderProps) {
  const { t, locale } = useLocaleContext();

  return (
    <ListSubheader component="div" {...props}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          mt: 2,
          gap: 2,
        }}>
        <Avatar
          variant="rounded"
          src={getProjectIconUrl(project.id, { blockletDid: project.blockletDid, updatedAt: project.updatedAt })}
        />

        <Stack
          sx={{
            flex: 1,
            width: 1,
          }}>
          <Typography variant="subtitle2" noWrap>
            {project.name || t('unnamed')}
          </Typography>
          {project.description && (
            <Typography
              variant="caption"
              sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
              {project.description}
            </Typography>
          )}

          <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {t('author')} {/* @ts-ignore */}
            <Box component={DID} did={project.createdBy} copyable={false} responsive sx={{ flex: 2, width: 180 }} />
          </Typography>

          <Typography variant="caption">
            {t('updatedAt')} &nbsp;
            {/* @ts-ignore */}
            <RelativeTime locale={locale} value={project.updatedAt} />
          </Typography>
        </Stack>
      </Stack>
    </ListSubheader>
  );
}

import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import {
  Autocomplete,
  AutocompleteProps,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { WritableDraft } from 'immer';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import ComponentSettings from './ComponentSettings';

export default function AppearanceSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const { appearance } = output;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputAppearance>) => void) => {
    doc.transact(() => {
      if (typeof output.appearance !== 'object') output.appearance = {};
      update(output.appearance);
    });
  };

  const { title, tags } = useMemo(() => {
    const m: { [key: string]: { title: string; tags: string } } = {
      [RuntimeOutputVariable.appearancePage]: { title: t('appearancePage'), tags: 'aigne-page' },
      [RuntimeOutputVariable.appearanceInput]: { title: t('appearanceInput'), tags: 'aigne-input' },
      [RuntimeOutputVariable.appearanceOutput]: { title: t('appearanceOutput'), tags: 'aigne-output' },
    };
    return m[output.name!] || { title: t('appearance'), tags: 'aigne-view' };
  }, [output.name]);

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        <Typography variant="subtitle1">{title}</Typography>

        <Box>
          <Typography variant="subtitle2">{t('icon')}</Typography>
          <TextField
            fullWidth
            hiddenLabel
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box component={Icon} icon={appearance?.icon || ''} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" href="https://icon-sets.iconify.design" target="_blank">
                    <Box component={Icon} icon="tabler:search" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            value={appearance?.icon || ''}
            onChange={(e) =>
              setField((c) => {
                c.icon = e.target.value;
              })
            }
          />
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('title')}</Typography>
          <TextField
            fullWidth
            hiddenLabel
            value={appearance?.title || ''}
            onChange={(e) =>
              setField((c) => {
                c.title = e.target.value;
              })
            }
          />
        </Box>

        <Box>
          <Typography variant="subtitle2">{t('selectCustomComponent')}</Typography>
          <ComponentSelect
            tags={tags}
            value={appearance?.componentId ? { id: appearance.componentId, name: appearance.componentName } : undefined}
            onChange={(_, v) =>
              setField((config) => {
                config.componentId = v?.id;
                config.componentName = v?.name;
              })
            }
          />
        </Box>
      </Stack>

      {appearance?.componentId && <ComponentSettings value={appearance} />}
    </Stack>
  );
}

function ComponentSelect({
  tags,
  ...props
}: { tags?: string } & Partial<AutocompleteProps<Pick<Component, 'id' | 'name'>, false, false, false>>) {
  const { value, loading } = useAsync(() => getComponents({ tags }), [tags]);

  return (
    <Autocomplete
      options={value?.components ?? []}
      loading={loading}
      {...props}
      renderInput={(params) => <TextField hiddenLabel {...params} />}
      getOptionLabel={(component) => component.name || component.id}
      isOptionEqualToValue={(o, v) => o.id === v.id}
    />
  );
}

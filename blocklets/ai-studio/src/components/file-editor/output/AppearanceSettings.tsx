import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import {
  Autocomplete,
  AutocompleteProps,
  Box,
  Divider,
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

const ignoreIconTitleSettingsOutputs = new Set<string>([
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.children,
  RuntimeOutputVariable.profile,
]);

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

  const { tags } = useMemo(() => {
    const m: { [key: string]: { tags: string } } = {
      [RuntimeOutputVariable.appearancePage]: { tags: 'aigne-page,aigne-layout' },
      [RuntimeOutputVariable.appearanceInput]: { tags: 'aigne-input' },
      [RuntimeOutputVariable.appearanceOutput]: { tags: 'aigne-output' },
    };
    return m[output.name!] || { title: t('appearance'), tags: 'aigne-view' };
  }, [output.name]);

  return (
    <Box>
      <Stack gap={1}>
        {!ignoreIconTitleSettingsOutputs.has(output.name!) && (
          <>
            <Divider textAlign="left" sx={{ mt: 2 }}>
              {t('iconAndTitle')}
            </Divider>

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
                placeholder={t('appearanceIconPlaceholder')}
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
                placeholder={t('appearanceTitlePlaceholder')}
                value={appearance?.title || ''}
                onChange={(e) =>
                  setField((c) => {
                    c.title = e.target.value;
                  })
                }
              />
            </Box>
          </>
        )}

        <Divider textAlign="left" sx={{ mt: 2 }}>
          {t('appearance')}
        </Divider>

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

        {appearance?.componentId && <ComponentSettings value={appearance} />}
      </Stack>
    </Box>
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

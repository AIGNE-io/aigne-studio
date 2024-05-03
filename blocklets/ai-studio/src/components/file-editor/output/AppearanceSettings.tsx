import LogoField from '@app/components/publish/LogoField';
import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearancePage, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Autocomplete, AutocompleteProps, Box, Stack, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import ComponentSettings from './ComponentSettings';

export default function AppearanceSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as RuntimeOutputAppearancePage | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputAppearancePage>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue);
    });
  };

  const { title, tags } = useMemo(() => {
    const m: { [key: string]: { title: string; tags: string } } = {
      [RuntimeOutputVariable.appearancePage]: { title: t('appearancePage'), tags: 'aigne-page' },
      [RuntimeOutputVariable.appearanceInput]: { title: t('appearanceInput'), tags: 'aigne-input' },
      [RuntimeOutputVariable.appearanceOutput]: { title: t('appearanceOutput'), tags: 'aigne-output' },
    };
    return m[output.name!] || { title: '', tags: '' };
  }, [output.name]);

  return (
    <Stack gap={2}>
      {output.name === RuntimeOutputVariable.appearancePage && (
        <>
          <LogoField value={initialValue?.logo} onChange={(v) => setField((f) => (f.logo = v))} />

          <Box>
            <Typography variant="subtitle2">{t('agentName')}</Typography>
            <TextField
              fullWidth
              hiddenLabel
              multiline
              placeholder={t('agentNamePlaceholder')}
              value={initialValue?.name || ''}
              onChange={(e) => setField((f) => (f.name = e.target.value))}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2">{t('agentDescription')}</Typography>
            <TextField
              fullWidth
              hiddenLabel
              multiline
              minRows={2}
              placeholder={t('agentDescriptionPlaceholder')}
              value={initialValue?.description || ''}
              onChange={(e) => setField((f) => (f.description = e.target.value))}
            />
          </Box>
        </>
      )}

      <Stack gap={1}>
        <Typography variant="subtitle1">{title}</Typography>

        <Box>
          <Typography variant="subtitle2">{t('selectCustomComponent')}</Typography>
          <ComponentSelect
            tags={tags}
            value={
              initialValue?.componentId ? { id: initialValue.componentId, name: initialValue.componentName } : undefined
            }
            onChange={(_, v) =>
              setField((config) => {
                config.componentId = v?.id;
                config.componentName = v?.name;
              })
            }
          />
        </Box>
      </Stack>

      {initialValue?.componentId && <ComponentSettings value={initialValue} />}
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

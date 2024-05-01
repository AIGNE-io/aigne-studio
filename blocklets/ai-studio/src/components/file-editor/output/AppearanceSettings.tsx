import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, MenuItem, Stack, TextField, TextFieldProps, Typography } from '@mui/material';
import { WritableDraft } from 'immer';
import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import ComponentSettings from './ComponentSettings';

export default function AppearanceSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as RuntimeOutputAppearance | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputAppearance>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue);
    });
  };

  const title = useMemo(() => {
    return (
      {
        [RuntimeOutputVariable.appearancePage]: t('appearancePage'),
        [RuntimeOutputVariable.appearanceInput]: t('appearanceInput'),
        [RuntimeOutputVariable.appearanceOutput]: t('appearanceOutput'),
      } as { [key: string]: any }
    )[output.name as any];
  }, [output.name]);

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        <Typography variant="subtitle1">{title}</Typography>

        <Box>
          <Typography variant="subtitle2">{t('selectCustomComponent')}</Typography>
          <ComponentSelect
            value={initialValue?.componentId || ''}
            onChange={(e) =>
              setField((config) => {
                config.componentId = e.target.value;
              })
            }
          />
        </Box>
      </Stack>

      {initialValue?.componentId && <ComponentSettings value={initialValue} />}
    </Stack>
  );
}

function ComponentSelect({ ...props }: TextFieldProps) {
  const state = componentsState();

  useEffect(() => {
    if (!state.components?.length) {
      state.load();
    }
  }, []);

  return (
    <TextField select fullWidth hiddenLabel {...props}>
      {state.components?.map((i) => (
        <MenuItem key={i.id} value={i.id}>
          {i.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

const componentsState = create<{
  loading?: boolean;
  components?: Component[];
  load: () => Promise<Component[]>;
}>()(
  immer((set) => ({
    async load() {
      set((state) => {
        state.loading = true;
      });
      try {
        const { components } = await getComponents({});
        set((state) => {
          state.components = components;
        });

        return components;
      } finally {
        set((state) => {
          state.loading = false;
        });
      }
    },
  }))
);

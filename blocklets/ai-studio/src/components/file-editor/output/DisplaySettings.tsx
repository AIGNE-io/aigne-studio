import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputDisplayPreference, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, MenuItem, Stack, TextField, TextFieldProps, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

export default function DisplaySettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as OutputDisplayPreference | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (
    type: 'page' | 'inputs' | 'outputs',
    update: (draft: WritableDraft<NonNullable<OutputDisplayPreference[typeof type]>>) => void
  ) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      if (typeof output.initialValue[type] !== 'object') output.initialValue[type] = {};
      update(output.initialValue[type]);
    });
  };

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        <Typography variant="subtitle1">{t('page')}</Typography>

        <Box>
          <Typography variant="subtitle2">{t('component')}</Typography>
          <ComponentSelect
            value={initialValue?.page?.componentId || ''}
            onChange={(e) =>
              setField('page', (page) => {
                page.componentId = e.target.value;
              })
            }
          />
        </Box>
      </Stack>

      <Stack gap={1}>
        <Typography variant="subtitle1">{t('inputs')}</Typography>

        <Box>
          <Typography variant="subtitle2">{t('component')}</Typography>
          <ComponentSelect
            value={initialValue?.inputs?.componentId || ''}
            onChange={(e) =>
              setField('inputs', (page) => {
                page.componentId = e.target.value;
              })
            }
          />
        </Box>
      </Stack>

      <Stack gap={1}>
        <Typography variant="subtitle1">{t('outputs')}</Typography>

        <Box>
          <Typography variant="subtitle2">{t('component')}</Typography>
          <ComponentSelect
            value={initialValue?.outputs?.componentId || ''}
            onChange={(e) =>
              setField('outputs', (page) => {
                page.componentId = e.target.value;
              })
            }
          />
        </Box>
      </Stack>
    </Stack>
  );
}

const COMPONENTS = [
  { id: '1', name: 'Simple Page' },
  { id: '2', name: 'Auto Form' },
  { id: '3', name: 'Single Result' },
  { id: '4', name: 'Photo Gallery' },
];

function ComponentSelect({ ...props }: TextFieldProps) {
  return (
    <TextField select fullWidth hiddenLabel {...props}>
      {COMPONENTS.map((i) => (
        <MenuItem key={i.id} value={i.id}>
          {i.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Delete } from '@mui/icons-material';
import { Autocomplete, Box, Button, IconButton, TextField } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { Template } from '../../../api/src/store/templates';
import { getDatasets } from '../../libs/dataset';

export default function Datasets({
  value,
  onChange,
}: {
  value: Pick<Template, 'datasets'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
}) {
  const { t } = useLocaleContext();

  const { value: datasetsRes } = useAsync(() => getDatasets(), []);
  const datasets = useMemo(() => datasetsRes?.datasets.map((i) => ({ id: i._id!, name: i.name })) ?? [], [datasetsRes]);

  return (
    <>
      {value.datasets?.map((item, index) => (
        <Box key={item.id} sx={{ display: 'flex', my: 2, gap: 1 }}>
          <Autocomplete
            fullWidth
            size="small"
            value={item.vectorStore ?? null}
            onChange={(_, value) => onChange((v) => (v.datasets![index]!.vectorStore = value ?? undefined))}
            renderInput={(params) => <TextField {...params} label={t('form.dataset')} />}
            options={datasets}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            getOptionLabel={(v) => v.name || 'Unnamed'}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <IconButton size="small" onClick={() => onChange((v) => v.datasets!.splice(index, 1))}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      ))}

      <Button
        sx={{ mt: 2 }}
        variant="contained"
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid();
          onChange((v) => {
            v.datasets ??= [];
            v.datasets.push({ id, type: 'vectorStore' });
          });
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.add')} {t('form.dataset')}
      </Button>
    </>
  );
}

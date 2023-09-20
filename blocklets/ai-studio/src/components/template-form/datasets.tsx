import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Delete } from '@mui/icons-material';
import { Autocomplete, Box, Button, TextField } from '@mui/material';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { getDatasets } from '../../libs/dataset';
import type { TemplateForm } from '.';

export default function Datasets({ form }: { form: Pick<TemplateForm, 'datasets'> }) {
  const { t } = useLocaleContext();

  const { value: datasetsRes } = useAsync(() => getDatasets(), []);
  const datasets = useMemo(() => datasetsRes?.datasets.map((i) => ({ id: i._id!, name: i.name })) ?? [], [datasetsRes]);

  return (
    <>
      {form.datasets?.map((item, index) => (
        <Box key={item.id} sx={{ display: 'flex', my: 2 }}>
          <Autocomplete
            fullWidth
            size="small"
            value={item.vectorStore ?? null}
            onChange={(_, value) => (form.datasets![index]!.vectorStore = value ?? undefined)}
            renderInput={(params) => <TextField {...params} label={t('form.dataset')} />}
            options={datasets}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            getOptionLabel={(v) => v.name || 'Unnamed'}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
            <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => form.datasets!.splice(index, 1)}>
              <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
            </Button>
          </Box>
        </Box>
      ))}

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid();
          form.datasets ??= [];
          form.datasets.push({ id, type: 'vectorStore' });
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.add')} {t('form.dataset')}
      </Button>
    </>
  );
}

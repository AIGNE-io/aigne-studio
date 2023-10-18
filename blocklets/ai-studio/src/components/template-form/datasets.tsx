import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Add, Delete } from '@mui/icons-material';
import { Autocomplete, Box, Button, TextField } from '@mui/material';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { TemplateYjs } from '../../../api/src/store/projects';
import { getDatasets } from '../../libs/dataset';

export default function Datasets({ readOnly, form }: { readOnly?: boolean; form: Pick<TemplateYjs, 'datasets'> }) {
  const { t } = useLocaleContext();

  const { value: datasetsRes } = useAsync(() => getDatasets(), []);
  const datasets = useMemo(() => datasetsRes?.datasets.map((i) => ({ id: i._id!, name: i.name })) ?? [], [datasetsRes]);

  return (
    <>
      {form.datasets &&
        Object.values(form.datasets).map(({ data: item }) => (
          <Box key={item.id} sx={{ display: 'flex', my: 2 }}>
            <Autocomplete
              readOnly={readOnly}
              fullWidth
              size="small"
              value={item.vectorStore ?? null}
              onChange={(_, value) => (item.vectorStore = value ?? undefined)}
              renderInput={(params) => <TextField {...params} label={t('form.dataset')} />}
              options={datasets}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              getOptionLabel={(v) => v.name || 'Unnamed'}
            />

            {!readOnly && (
              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => delete form.datasets![item.id]}>
                  <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                </Button>
              </Box>
            )}
          </Box>
        ))}

      {!readOnly && (
        <Button
          fullWidth
          size="small"
          startIcon={<Add />}
          onClick={() => {
            const id = nanoid();
            (getYjsValue(form) as Map<any>).doc!.transact(() => {
              form.datasets ??= {};
              form.datasets[id] = { index: Object.keys(form.datasets).length, data: { id, type: 'vectorStore' } };
            });
            setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
          }}>
          {t('form.add')} {t('form.dataset')}
        </Button>
      )}
    </>
  );
}

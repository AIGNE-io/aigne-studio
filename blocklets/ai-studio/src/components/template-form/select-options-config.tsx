import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Add } from '@mui/icons-material';
import { Box, Button, Stack, TextField } from '@mui/material';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';

import DragVertical from '../../pages/project/icons/drag-vertical';
import Trash from '../../pages/project/icons/trash';
import { DragSortListYjs } from '../drag-sort-list';

export default function SelectOptionsConfig({
  readOnly,
  select,
}: {
  readOnly?: boolean;
  select: Extract<ParameterYjs, { type: 'select' }>;
}) {
  const { t } = useLocaleContext();

  return (
    <Box>
      {select.options && (
        <DragSortListYjs
          disabled={readOnly}
          list={select.options}
          renderItem={(option, _, params) => (
            <Stack direction="row" alignItems="center" gap={1} ref={params.drop}>
              <Stack
                direction="row"
                gap={1}
                bgcolor="background.paper"
                borderRadius={1}
                overflow="hidden"
                position="relative"
                p={0.5}
                ref={params.preview}>
                <TextField
                  hiddenLabel
                  InputProps={{ readOnly, inputProps: { id: `option-label-${option.id}` } }}
                  placeholder={t('label')}
                  value={option.label}
                  onChange={(e) => (option.label = e.target.value)}
                />
                <TextField
                  hiddenLabel
                  InputProps={{ readOnly }}
                  placeholder={t('value')}
                  value={option.value}
                  onChange={(e) => (option.value = e.target.value)}
                />
              </Stack>

              {!readOnly && (
                <Stack direction="row">
                  <Button
                    sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                    onClick={() => {
                      const doc = (getYjsValue(option) as Map<any>).doc!;
                      doc.transact(() => {
                        if (select.options) {
                          delete select.options[option.id];
                          sortBy(Object.values(select.options), (i) => i.index).forEach(
                            (i, index) => (i.index = index)
                          );
                        }
                      });
                    }}>
                    <Trash sx={{ fontSize: 18, color: 'grey.500' }} />
                  </Button>

                  <Button ref={params.drag} sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}>
                    <DragVertical sx={{ fontSize: 22, color: 'grey.500' }} />
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        />
      )}

      {!readOnly && (
        <Button
          fullWidth
          size="small"
          startIcon={<Add />}
          onClick={() => {
            const id = nanoid(16);
            const doc = (getYjsValue(select) as Map<any>).doc!;
            doc.transact(() => {
              select.options ??= {};
              select.options[id] = { index: Object.keys(select.options).length, data: { id, label: '', value: '' } };
            });
            setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
          }}>
          {t('addObject', { object: t('option') })}
        </Button>
      )}
    </Box>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
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
    <Box width={1}>
      {select.options && (
        <DragSortListYjs
          disabled={readOnly}
          list={select.options}
          renderItem={(option, _, params) => (
            <Stack direction="row" alignItems="center" gap={1} ref={params.drop}>
              <Stack
                flex={1}
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
                  sx={{ flex: 1 }}
                />
                <TextField
                  hiddenLabel
                  InputProps={{ readOnly }}
                  placeholder={option.label || t('value')}
                  value={option.value}
                  onChange={(e) => (option.value = e.target.value)}
                  sx={{ flex: 1 }}
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
          startIcon={<Box component={Icon} icon={PlusIcon} />}
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

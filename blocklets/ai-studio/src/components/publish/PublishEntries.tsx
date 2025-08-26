import DragVertical from '@app/pages/project/icons/drag-vertical';
import Trash from '@app/pages/project/icons/trash';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { AssistantBase, AssistantYjs, parameterFromYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { useState } from 'react';

import { DragSortItemRenderParams, DragSortListYjs } from '../drag-sort-list';

export default function PublishEntries({ assistant }: { assistant: AssistantYjs }) {
  const doc = (getYjsValue(assistant) as Map<any>).doc!;

  const { t } = useLocaleContext();

  const [currentId, setCurrentId] = useState<string>();
  const current = assistant.entries?.[currentId!]?.data;

  return (
    <Stack>
      <Box className="between">
        <Typography
          variant="subtitle2"
          sx={{
            mb: 0.5,
          }}>
          {t('openingQuestion')}
        </Typography>

        <Button
          sx={{ cursor: 'pointer', color: 'info.main', minWidth: 32, minHeight: 32, p: 0 }}
          onClick={() => {
            const id = nanoid();
            doc.transact(() => {
              assistant.entries ??= {};
              const index = Object.values(assistant.entries).length;
              assistant.entries[id] = { index, data: { id } };
            });
            setCurrentId(id);
          }}>
          <Box component={Icon} icon={PlusIcon} />
        </Button>
      </Box>
      {assistant.entries && (
        <DragSortListYjs
          list={assistant.entries}
          renderItem={(item, _, params) => (
            <EntryItemView
              key={item.id}
              entry={item}
              {...params}
              onClick={() => setCurrentId(item.id)}
              onDelete={() => {
                doc.transact(() => {
                  assistant.entries ??= {};
                  delete assistant.entries[item.id];
                  Object.values(assistant.entries).forEach((i, index) => (i.index = index));
                });
              }}
            />
          )}
        />
      )}
      <Dialog
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        open={!!current}
        onClose={() => setCurrentId(undefined)}
        fullWidth
        maxWidth="sm">
        <DialogTitle>{t('openingQuestion')}</DialogTitle>
        <DialogContent>{current && <PublishEntriesForm assistant={assistant} entry={current} />}</DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" onClick={() => setCurrentId(undefined)}>
            {t('ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function EntryItemView({
  entry,
  isDragging,
  drag,
  drop,
  preview,
  onDelete = undefined,
  onClick = undefined,
}: {
  entry: NonNullable<AssistantBase['entries']>[number];
  onDelete?: () => void;
  onClick?: () => void;
} & DragSortItemRenderParams) {
  const { t } = useLocaleContext();

  return (
    <Stack
      direction="row"
      ref={(v) => {
        drop(v);
      }}
      sx={{
        gap: 0.5,
        alignItems: 'center',
        borderRadius: 1,
        bgcolor: isDragging ? 'grey.200' : 'none',

        ':hover': {
          bgcolor: 'grey.100',

          '.hover-visible': {
            display: 'flex',
          },
        },
      }}>
      <Button
        ref={(v) => {
          drag(v);
        }}
        sx={{ minWidth: 24, minHeight: 24, p: 0, cursor: 'move' }}>
        <DragVertical />
      </Button>
      <Typography
        noWrap
        ref={(v) => {
          preview(v);
        }}
        onClick={onClick}
        sx={{
          flex: 1,
          borderRadius: 1,
          color: entry.title ? 'unset' : 'text.disabled',
        }}>
        {entry.title || t('untitled')}
      </Typography>
      <Stack
        direction="row"
        className="hover-visible"
        sx={{
          gap: 0.5,
          display: 'none',
        }}>
        {onDelete && (
          <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} onClick={onDelete}>
            <Trash fontSize="small" />
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function PublishEntriesForm({
  assistant,
  entry,
}: {
  assistant: AssistantYjs;
  entry: NonNullable<AssistantBase['entries']>[number];
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(entry) as Map<any>).doc!;

  const parameters = sortBy(Object.values(assistant.parameters ?? {}), (i) => i.index).filter(
    (i): i is typeof i & { data: { key: string } } => !!i.data.key && !i.data.hidden
  );

  return (
    <Stack
      sx={{
        gap: 1,
      }}>
      <TextField
        label={t('openingQuestion')}
        multiline
        value={entry.title || ''}
        onChange={(e) => (entry.title = e.target.value)}
      />
      <Typography variant="subtitle2">{t('input')}</Typography>
      {parameters.map(({ data: parameter }) => {
        return (
          <Box key={parameter.id}>
            <ParameterField
              label={parameter.label || parameter.key}
              fullWidth
              parameter={parameterFromYjs(parameter)}
              maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
              value={entry.parameters?.[parameter.key] || ''}
              onChange={(value) => {
                doc.transact(() => {
                  entry.parameters ??= {};
                  entry.parameters[parameter.key] = value;
                });
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

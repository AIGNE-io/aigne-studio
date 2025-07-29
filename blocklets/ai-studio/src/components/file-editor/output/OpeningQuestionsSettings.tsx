import { DragSortItemContainer, DragSortListYjs } from '@app/components/drag-sort-list';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterField } from '@blocklet/ai-runtime/components';
import {
  AssistantYjs,
  OutputVariableYjs,
  RuntimeOutputOpeningQuestionsYjs,
  parameterFromYjs,
} from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import plusIcon from '@iconify-icons/tabler/plus';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';

export default function OpeningQuestionsSettings({
  agent,
  output,
}: {
  agent: AssistantYjs;
  output: OutputVariableYjs;
}) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as RuntimeOutputOpeningQuestionsYjs | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputOpeningQuestionsYjs>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue as RuntimeOutputOpeningQuestionsYjs);
    });
  };

  const onDelete = (item: NonNullable<RuntimeOutputOpeningQuestionsYjs['items']>[string]['data']) => {
    if (!initialValue) return;

    setField(() => {
      initialValue.items ??= {};
      delete initialValue.items[item.id];
      Object.values(initialValue.items).forEach((i, index) => (i.index = index));
    });
  };

  return (
    <Box>
      <Typography variant="subtitle2">{t('openingQuestions')}</Typography>

      {initialValue?.items && (
        <DragSortListYjs
          list={initialValue.items}
          component={Stack}
          sx={{ gap: 1 }}
          renderItem={(item, _, params) => (
            <DragSortItemContainer
              key={item.id}
              {...params}
              sx={{
                '> div': { display: 'flex' },
                '.hover-visible': {
                  position: 'static',
                  maxHeight: 'unset',
                  m: 0,
                  width: 'unset',
                  '>div': { border: 0, py: 0 },
                },
              }}
              onDelete={() => onDelete(item)}>
              <EntryItemView key={item.id} assistant={agent} item={item} />
            </DragSortItemContainer>
          )}
        />
      )}

      <Box>
        <Button
          startIcon={<Icon icon={plusIcon} />}
          onClick={() => {
            setField((v) => {
              const id = nanoid();
              v.items ??= {};
              v.items[id] = { index: Object.values(v.items).length, data: { id, parameters: {} } };
            });
          }}>
          {t('addObject', { object: t('question') })}
        </Button>
      </Box>
    </Box>
  );
}

function EntryItemView({
  assistant,
  item,
}: {
  assistant: AssistantYjs;
  item: NonNullable<RuntimeOutputOpeningQuestionsYjs['items']>[string]['data'];
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(item) as Map<any>).doc!;

  const parameters = sortBy(Object.values(assistant.parameters ?? {}), (i) => i.index).filter(
    (i): i is typeof i & { data: { key: string; hidden?: boolean } } => !!i.data.key && !i.data.hidden
  );

  return (
    <Stack
      sx={{
        flex: 1,
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'grey.200',
        borderRadius: 1,
      }}>
      <TextField
        label={t('openingQuestion')}
        placeholder={t('openingQuestionPlaceholder')}
        value={item.title || ''}
        onChange={(e) => (item.title = e.target.value)}
        slotProps={{
          inputLabel: { shrink: true }
        }}
      />
      {parameters.map(({ data: parameter }) => {
        return (
          <ParameterField
            key={parameter.id}
            label={parameter.label || parameter.key}
            InputLabelProps={{ shrink: true }}
            placeholder={parameter.key === 'question' ? item.title : undefined}
            fullWidth
            parameter={parameterFromYjs(parameter)}
            maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
            value={item.parameters?.[parameter.key] || ''}
            onChange={(value) => {
              doc.transact(() => {
                item.parameters ??= {};
                item.parameters[parameter.key] = value;
              });
            }}
          />
        );
      })}
    </Stack>
  );
}

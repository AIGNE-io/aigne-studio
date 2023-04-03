import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { useReactive } from 'ahooks';
import equal from 'fast-deep-equal';
import { WritableDraft } from 'immer/dist/internal';
import { omit } from 'lodash';
import { nanoid } from 'nanoid';
import { useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DragSortListItem } from '../drag-sort';
import ParameterField from '../parameter-field';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function BranchForm({
  value,
  onChange,
}: {
  value: Pick<TemplateForm, 'branch' | 'parameters'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
}) {
  const { t } = useLocaleContext();

  const data = useReactive<{ branches: ({ id: string } & NonNullable<TemplateForm['branch']>['branches'][0])[] }>({
    branches: [],
  });

  const cachedValue = useRef<NonNullable<TemplateForm['branch']>>();

  useEffect(() => {
    if (!equal(value.branch, cachedValue.current)) {
      cachedValue.current = value.branch;
      data.branches = (value.branch?.branches ?? []).map((i) => ({
        ...i,
        id: i.template?.id || nanoid(),
      }));
    }
  }, [value.branch]);

  useEffect(() => {
    const newValue: NonNullable<TemplateForm['branch']> = JSON.parse(
      JSON.stringify({ ...data, branches: data.branches.map((i) => omit(i, 'id')) })
    );

    if (!equal(newValue, cachedValue.current)) {
      cachedValue.current = newValue;
      onChange((form) => {
        form.branch = newValue;
        if (!form.parameters?.question) {
          form.parameters ??= {};
          form.parameters.question = {};
        }
      });
    }
  });

  const { question } = value.parameters ?? {};

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <Box>
          {data.branches.map((branch, index) => (
            <DragSortListItem
              sx={{ my: 2, alignItems: 'baseline', pr: 2 }}
              key={branch.id}
              dragType="BRANCH_ITEM"
              dropType={['BRANCH_ITEM']}
              id={branch.id}
              index={index}
              move={(id, toIndex) => {
                const srcIndex = data.branches.findIndex((i) => i.id === id);
                data.branches.splice(toIndex, 0, ...data.branches.splice(srcIndex, 1));
              }}
              actions={
                <Box onClick={() => data.branches.splice(index, 1)}>
                  <Delete />
                </Box>
              }>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TemplateAutocomplete
                  autoSelect
                  freeSolo
                  fullWidth
                  size="small"
                  value={branch.template ?? null}
                  onChange={(_, v) =>
                    (branch.template = (typeof v === 'string' ? { id: '', name: v } : v) ?? undefined)
                  }
                  renderInput={(params) => <TextField {...params} label={t('form.name')} />}
                />

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={5}
                  label={t('form.description')}
                  value={branch.description}
                  onChange={(e) => (branch.description = e.target.value)}
                />
              </Box>
            </DragSortListItem>
          ))}

          <Button
            fullWidth
            size="small"
            startIcon={<Add />}
            onClick={() => {
              const id = nanoid();
              data.branches.push({ id, description: '' });
              setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
            }}>
            {t('form.add')} {t('form.branch')}
          </Button>
        </Box>
      </DndProvider>

      {question && (
        <Box mt={2}>
          <ParameterField
            fullWidth
            size="small"
            label={question.label || 'question'}
            parameter={question}
            helperText={question.helper}
            value={question.value ?? question.defaultValue ?? ''}
            onChange={(value) => onChange((v) => (v.parameters!.question!.value = value))}
          />
        </Box>
      )}
    </>
  );
}

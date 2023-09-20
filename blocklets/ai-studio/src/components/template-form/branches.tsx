import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Construction, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { isTemplateEmpty } from '../../libs/template';
import { createFile, isTemplate, useStore } from '../../pages/project/yjs-state';
import dirname from '../../utils/path';
import ReorderableList from '../reorderable-list';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function Branches({
  form,
  onTemplateClick,
}: {
  form: Pick<TemplateForm, 'branch' | 'parameters'>;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { ref, '*': path } = useParams();
  if (!ref) throw new Error('Missing required params `ref`');

  const { t } = useLocaleContext();

  const { store } = useStore();
  const templates = Object.values(store.files).filter(isTemplate);

  const isTemplateWarning = useCallback(
    ({ id }: { id: string }) => {
      const t = templates.find((i) => i.id === id);
      return !t || isTemplateEmpty(t);
    },
    [templates]
  );

  const branches = form.branch?.branches;

  return (
    <>
      {branches && (
        <ReorderableList
          list={branches}
          itemKey="id"
          onChange={(branches) => {
            form.branch!.branches = branches;
          }}
          renderItem={(branch, index) => (
            <>
              <Box sx={{ flex: 1, mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TemplateAutocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  value={branch.template ?? null}
                  onChange={(_, value) =>
                    (form.branch!.branches[index]!.template =
                      (typeof value === 'string' ? { id: '', name: value } : value) ?? undefined)
                  }
                  renderInput={(params) => <TextField {...params} label={t('form.name')} />}
                  options={templates}
                  createTemplate={async (data) =>
                    createFile({
                      store,
                      parent: dirname(path || '').split('/'),
                      meta: data,
                    }).template
                  }
                />

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={5}
                  label={t('form.description')}
                  value={branch.description}
                  onChange={(e) => (form.branch!.branches[index]!.description = e.target.value)}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
                {onTemplateClick && branch.template && (
                  <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => onTemplateClick(branch.template!)}>
                    <Construction
                      sx={{
                        fontSize: 16,
                        color: isTemplateWarning(branch.template) ? 'warning.main' : 'grey.500',
                      }}
                    />
                  </Button>
                )}

                <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => form.branch!.branches.splice(index, 1)}>
                  <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                </Button>
              </Box>
            </>
          )}
        />
      )}

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid();
          form.branch ??= { branches: [] };
          form.branch?.branches.push({ id, description: '' });
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.add')} {t('form.branch')}
      </Button>
    </>
  );
}

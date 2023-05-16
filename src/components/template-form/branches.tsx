import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Construction, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';

import { isTemplateEmpty } from '../../libs/templates';
import ReorderableList from '../reorderable-list';
import { useTemplates } from '../template-list';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function Branches({
  value,
  onChange,
  onTemplateClick,
}: {
  value: Pick<TemplateForm, 'branch' | 'parameters'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { t } = useLocaleContext();
  const { templates, create } = useTemplates();

  const isTemplateWarning = useCallback(
    ({ id }: { id: string }) => {
      const t = templates.find((i) => i._id === id);
      return !t || isTemplateEmpty(t);
    },
    [templates]
  );

  const branches = value.branch?.branches;

  return (
    <>
      {branches && (
        <ReorderableList
          list={branches}
          itemKey="id"
          onChange={(branches) =>
            onChange((v) => {
              v.branch!.branches = branches;
            })
          }
          renderItem={(branch, index) => (
            <>
              <Box sx={{ flex: 1, mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TemplateAutocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  value={branch.template ?? null}
                  onChange={(_, value) =>
                    onChange(
                      (v) =>
                        (v.branch!.branches[index]!.template =
                          (typeof value === 'string' ? { id: '', name: value } : value) ?? undefined)
                    )
                  }
                  renderInput={(params) => <TextField {...params} label={t('form.name')} />}
                  options={templates}
                  createTemplate={create}
                />

                <TextField
                  fullWidth
                  size="small"
                  multiline
                  maxRows={5}
                  label={t('form.description')}
                  value={branch.description}
                  onChange={(e) => onChange((v) => (v.branch!.branches[index]!.description = e.target.value))}
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

                <Button
                  sx={{ minWidth: 0, p: 0.2 }}
                  onClick={() => onChange((v) => v.branch!.branches.splice(index, 1))}>
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
          onChange((v) => {
            v.branch ??= { branches: [] };
            v.branch?.branches.push({ id, description: '' });
          });
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.add')} {t('form.branch')}
      </Button>
    </>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Add, Construction, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { nanoid } from 'nanoid';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { TemplateYjs } from '../../../api/src/store/projects';
import { isTemplateYjsEmpty } from '../../libs/template';
import { createFile, isTemplate, useStore } from '../../pages/project/yjs-state';
import dirname from '../../utils/path';
import { ReorderableListYjs } from '../reorderable-list';
import TemplateAutocomplete from './template-autocomplete';

export default function Branches({
  form,
  onTemplateClick,
}: {
  form: Pick<TemplateYjs, 'branch' | 'parameters'>;
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
      return !t || isTemplateYjsEmpty(t);
    },
    [templates]
  );

  const branches = form.branch?.branches;

  return (
    <>
      {branches && (
        <ReorderableListYjs
          list={branches}
          renderItem={(branch) => (
            <>
              <Box sx={{ flex: 1, mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TemplateAutocomplete
                  freeSolo
                  fullWidth
                  size="small"
                  value={branch.template ?? null}
                  onChange={(_, value) =>
                    (branch.template = (typeof value === 'string' ? { id: '', name: value } : value) ?? undefined)
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
                  onChange={(e) => (branch.description = e.target.value)}
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

                <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => delete form.branch!.branches[branch.id]}>
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
          (getYjsValue(form) as Map<any>).doc!.transact(() => {
            form.branch ??= { branches: {} };
            form.branch!.branches[id] = {
              index: Object.keys(form.branch.branches).length,
              data: { id, description: '' },
            };
          });
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.add')} {t('form.branch')}
      </Button>
    </>
  );
}

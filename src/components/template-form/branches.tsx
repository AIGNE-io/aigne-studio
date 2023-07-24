import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Add, Construction, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { nanoid } from 'nanoid';
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { isTemplateEmpty } from '../../libs/template';
import { useProjectState } from '../../pages/project/state';
import ReorderableList from '../reorderable-list';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function Branches({
  projectId,
  value,
  onChange,
  onTemplateClick,
}: {
  projectId: string;
  value: Pick<TemplateForm, 'branch' | 'parameters'>;
  onChange: (update: (v: WritableDraft<typeof value>) => void) => void;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { ref, '*': path } = useParams();
  if (!ref) throw new Error('Missing required params `ref`');

  const { t } = useLocaleContext();
  const {
    state: { files },
    createFile,
  } = useProjectState(projectId, ref);

  const templates = useMemo(() => {
    return files.filter((i): i is typeof i & { type: 'file' } => i.type === 'file').map((i) => i.meta);
  }, [files]);

  const isTemplateWarning = useCallback(
    ({ id }: { id: string }) => {
      const t = templates.find((i) => i.id === id);
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
                  createTemplate={(data) =>
                    createFile({ projectId, branch: ref, path: path || '', input: { type: 'file', data } })
                  }
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

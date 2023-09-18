import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Construction, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { isTemplateEmpty } from '../../libs/template';
import { useProjectState } from '../../pages/project/state';
import dirname from '../../utils/path';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function Next({
  projectId,
  value,
  onChange,
  onTemplateClick,
}: {
  projectId: string;
  value: Pick<TemplateForm, 'next'>;
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

  const { next } = value;

  return (
    <Box sx={{ mt: 2, display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TemplateAutocomplete
          freeSolo
          fullWidth
          size="small"
          value={next?.id ? (next as { id: string }) : null}
          onChange={(_, value) =>
            onChange((v) => {
              v.next ??= {};
              v.next.id = typeof value === 'object' ? value?.id : undefined;
              v.next.name = typeof value === 'object' ? value?.name : undefined;
            })
          }
          renderInput={(params) => <TextField {...params} label={t('form.next')} />}
          options={templates}
          createTemplate={(data) =>
            createFile({ projectId, branch: ref, path: dirname(path || ''), input: { type: 'file', data } })
          }
        />

        <TextField
          fullWidth
          size="small"
          label={t('form.outputKey')}
          value={value.next?.outputKey || ''}
          onChange={(e) =>
            onChange((v) => {
              v.next ??= {};
              v.next.outputKey = e.target.value;
            })
          }
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
        {onTemplateClick && value.next?.id && (
          <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => onTemplateClick({ id: value.next!.id! })}>
            <Construction
              sx={{
                fontSize: 16,
                color: isTemplateWarning({ id: value.next!.id }) ? 'warning.main' : 'grey.500',
              }}
            />
          </Button>
        )}

        <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => onChange((v) => (v.next = {}))}>
          <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
        </Button>
      </Box>
    </Box>
  );
}

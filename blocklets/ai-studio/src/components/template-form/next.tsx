import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Construction, Delete } from '@mui/icons-material';
import { Box, Button, TextField } from '@mui/material';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { isTemplateYjsEmpty } from '../../libs/template';
import { createFile, isTemplate, useStore } from '../../pages/project/yjs-state';
import dirname from '../../utils/path';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import TemplateAutocomplete from './template-autocomplete';
import type { TemplateForm } from '.';

export default function Next({
  readOnly,
  projectId,
  gitRef,
  form,
  onTemplateClick,
}: {
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
  form: Pick<TemplateForm, 'id' | 'next'>;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { ref, '*': path } = useParams();
  if (!ref) throw new Error('Missing required params `ref`');

  const { t } = useLocaleContext();

  const { store } = useStore(projectId, gitRef);
  const templates = Object.values(store.files).filter(isTemplate);

  const isTemplateWarning = useCallback(
    ({ id }: { id: string }) => {
      const t = templates.find((i) => i.id === id);
      return !t || isTemplateYjsEmpty(t);
    },
    [templates]
  );

  const { next } = form;

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <TemplateAutocomplete
          readOnly={readOnly}
          freeSolo
          fullWidth
          size="small"
          value={next?.id ? (next as { id: string }) : null}
          onChange={(_, value) => {
            form.next ??= {};
            form.next.id = typeof value === 'object' ? value?.id : undefined;
            form.next.name = typeof value === 'object' ? value?.name : undefined;
          }}
          renderInput={(params) => <TextField {...params} label={t('form.next')} />}
          options={templates}
          createTemplate={async (data) =>
            createFile({
              store,
              parent: dirname(path || '').split('/'),
              meta: data,
            }).template
          }
        />

        <Box position="relative">
          <WithAwareness projectId={projectId} gitRef={gitRef} path={[form.id, 'next.outputKey']}>
            <TextField
              fullWidth
              size="small"
              label={t('form.outputKey')}
              value={form.next?.outputKey || ''}
              onChange={(e) => {
                (getYjsValue(form) as Map<any>).doc!.transact(() => {
                  form.next ??= {};
                  form.next.outputKey = e.target.value;
                });
              }}
              InputProps={{ readOnly }}
            />
          </WithAwareness>

          <AwarenessIndicator
            projectId={projectId}
            gitRef={gitRef}
            path={[form.id, 'next.outputKey']}
            sx={{ position: 'absolute', right: -16, top: 16 }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.5 }}>
        {onTemplateClick && form.next?.id && (
          <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => onTemplateClick({ id: form.next!.id! })}>
            <Construction
              sx={{
                fontSize: 16,
                color: isTemplateWarning({ id: form.next!.id }) ? 'warning.main' : 'grey.500',
              }}
            />
          </Button>
        )}

        {!readOnly && (
          <Button sx={{ minWidth: 0, p: 0.2 }} onClick={() => (form.next = {})}>
            <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
          </Button>
        )}
      </Box>
    </Box>
  );
}

import LogoField from '@app/components/publish/LogoField';
import { useCurrentProject } from '@app/contexts/project';
import { getAssetUrl } from '@app/libs/asset';
import { uploadAsset } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { OutputVariableYjs, RuntimeOutputProfile } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

export default function ProfileSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();

  const initialValue = output.initialValue as RuntimeOutputProfile | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputProfile>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue as RuntimeOutputProfile);
    });
  };

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="subtitle2">{t('avatar')}</Typography>
        <LogoField
          value={
            initialValue?.avatar
              ? { url: getAssetUrl({ projectId, projectRef, filename: initialValue.avatar }) }
              : undefined
          }
          onChange={async (v) => {
            try {
              const { filename } = await uploadAsset({ projectId, ref: projectRef, source: v.url });
              setField((f) => (f.avatar = filename));
            } catch (error) {
              Toast.error(error.message);
              throw error;
            }
          }}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2">{t('agentName')}</Typography>
        <TextField
          fullWidth
          hiddenLabel
          multiline
          placeholder={t('agentNamePlaceholder')}
          value={initialValue?.name || ''}
          onChange={(e) => setField((f) => (f.name = e.target.value))}
        />
      </Box>
    </Stack>
  );
}

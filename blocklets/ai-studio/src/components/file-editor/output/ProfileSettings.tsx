import LogoField from '@app/components/publish/LogoField';
import { useCurrentProject } from '@app/contexts/project';
import { getAssetUrl } from '@app/libs/asset';
import { getProjectIconUrl, uploadAsset } from '@app/libs/project';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { OutputVariableYjs, RuntimeOutputProfile } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

export default function ProfileSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);

  const initialValue = output.initialValue as RuntimeOutputProfile | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputProfile>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue as RuntimeOutputProfile);
    });
  };

  return (
    <Stack sx={{
      gap: 2
    }}>
      <Box>
        <Typography variant="subtitle2">{t('avatar')}</Typography>
        <LogoField
          value={
            initialValue?.avatar
              ? { url: getAssetUrl({ projectId, projectRef, filename: initialValue.avatar }) }
              : {
                  url: getProjectIconUrl(projectId, {
                    projectRef,
                    working: true,
                    updatedAt: projectSetting?.iconVersion,
                  }),
                }
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
          data-testid="profile-setting-agent-name"
          fullWidth
          hiddenLabel
          multiline
          placeholder={projectSetting?.name || t('agentNamePlaceholder')}
          value={initialValue?.name || ''}
          onChange={(e) => setField((f) => (f.name = e.target.value))}
        />
      </Box>
      <Box>
        <Typography variant="subtitle2">{t('agentDescription')}</Typography>
        <TextField
          data-testid="profile-setting-agent-description"
          fullWidth
          hiddenLabel
          multiline
          minRows={2}
          placeholder={projectSetting?.description || t('agentDescriptionPlaceholder')}
          value={initialValue?.description || ''}
          onChange={(e) => setField((f) => (f.description = e.target.value))}
        />
      </Box>
      <Box>
        <Typography variant="subtitle2">{t('ogImage')}</Typography>
        <TextField
          fullWidth
          hiddenLabel
          value={initialValue?.ogImage || ''}
          onChange={(e) => setField((f) => (f.ogImage = e.target.value))}
        />
      </Box>
    </Stack>
  );
}

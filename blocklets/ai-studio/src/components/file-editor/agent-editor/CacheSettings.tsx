import LoadingButton from '@app/components/loading/loading-button';
import { useCurrentProject } from '@app/contexts/project';
import { getErrorMessage } from '@app/libs/api';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { deleteAgentCache } from '@blocklet/aigne-sdk/api/cache';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import { Box, Fade, FormControl, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useRequest } from 'ahooks';

export function CacheSettingsSummary({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();

  return (
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
      }}>
      {agent.cache?.enable ? t('enabled') : t('disabled')}
    </Typography>
  );
}

export function CacheSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        px: 1.5,
        py: 1,
        gap: 4,
      }}>
      <FormControl>
        <FormControlLabel
          labelPlacement="start"
          label={t('enableObject', { object: t('cache') })}
          control={
            <Switch
              size="small"
              checked={agent.cache?.enable || false}
              onChange={(_, check) => {
                doc.transact(() => {
                  agent.cache ??= {};
                  agent.cache.enable = check;
                });
              }}
            />
          }
        />
      </FormControl>
      <DeleteCacheButton agent={agent} />
    </Stack>
  );
}

function DeleteCacheButton({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();

  const { run, error, data } = useRequest(
    () => deleteAgentCache({ aid: stringifyIdentity({ projectId, projectRef, agentId: agent.id }) }),
    { manual: true, onError: (error) => Toast.error(getErrorMessage(error)) }
  );

  return (
    <Stack
      direction="row"
      sx={{
        gap: 1,
        alignItems: 'center',
      }}>
      <LoadingButton variant="outlined" size="small" onClick={run} loadingPosition="start">
        {t('cleanCache')}
      </LoadingButton>
      <Fade in={!!data && !error} timeout={300}>
        <Box sx={{ color: 'success.main', fontSize: 24 }}>
          <Icon icon={CheckIcon} />
        </Box>
      </Fade>
    </Stack>
  );
}

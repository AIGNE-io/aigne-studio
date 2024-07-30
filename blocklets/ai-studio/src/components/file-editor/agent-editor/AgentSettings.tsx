import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, FormControl, Stack, Switch, Typography } from '@mui/material';

import { CronSettings } from './CronSettings';

export function AgentSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;

  return (
    <Stack gap={2}>
      <Stack gap={2} direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="body2">{t('cache')}</Typography>

        <FormControl>
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
        </FormControl>
      </Stack>

      <Box>
        <Typography variant="body2">Cron Jobs</Typography>

        <CronSettings agent={agent} />
      </Box>
    </Stack>
  );
}

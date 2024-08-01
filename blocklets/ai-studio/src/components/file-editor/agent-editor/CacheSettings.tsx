import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, FormControl, FormControlLabel, Switch } from '@mui/material';

export function CacheSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;

  return (
    <Box px={1.5} py={1}>
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
    </Box>
  );
}

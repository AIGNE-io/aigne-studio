import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { FormControl, FormControlLabel, Switch } from '@mui/material';

export function AgentSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;

  return (
    <FormControl>
      <FormControlLabel
        label={t('enableObject', { object: t('cache') })}
        labelPlacement="start"
        control={
          <Switch
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
  );
}

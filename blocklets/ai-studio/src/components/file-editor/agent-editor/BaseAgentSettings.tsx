import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { FormControl, FormControlLabel, Stack, Switch } from '@mui/material';

export function BaseAgentSettingsSummary(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: { agent: AssistantYjs }
) {
  return null;
}

export function BaseAgentSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;

  return (
    <Stack direction="row" alignItems="center" px={1.5} py={1} gap={4}>
      <FormControl>
        <FormControlLabel
          labelPlacement="start"
          label={t('enableObject', { object: t('openEmbed') })}
          control={
            <Switch
              size="small"
              checked={agent.openEmbed?.enable || false}
              onChange={(_, check) => {
                doc.transact(() => {
                  agent.openEmbed ??= {};
                  agent.openEmbed.enable = check;
                });
              }}
            />
          }
        />
      </FormControl>
    </Stack>
  );
}

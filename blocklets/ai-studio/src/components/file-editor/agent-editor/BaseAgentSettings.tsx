import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { AssistantYjs } from '@blocklet/ai-runtime/types';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { FormControl, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';

import { PremiumFeatureTag, useMultiTenantRestriction } from '../../multi-tenant-restriction';

export function BaseAgentSettingsSummary(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _props: { agent: AssistantYjs }
) {
  return null;
}

export function BaseAgentSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(agent) as Map<any>).doc!;
  const { quotaChecker } = useMultiTenantRestriction();

  return (
    <Stack direction="column" px={1.5} py={1} gap={1}>
      <Stack alignItems="flex-start">
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

      <Stack alignItems="flex-start">
        <Stack direction="row" alignItems="center">
          <FormControl>
            <FormControlLabel
              labelPlacement="start"
              label={t('loginRequired')}
              control={
                <Switch
                  size="small"
                  checked={!agent.access?.noLoginRequired}
                  onChange={(_, check) => {
                    if (!quotaChecker.checkAnonymousRequest()) return;
                    doc.transact(() => {
                      agent.access ??= {};
                      agent.access.noLoginRequired = !check;
                    });
                  }}
                />
              }
            />
          </FormControl>
          <PremiumFeatureTag sx={{ ml: 3 }} onClick={() => quotaChecker.checkAnonymousRequest()} />
        </Stack>
        <FormHelperText sx={{ ml: 0 }}>
          {t(!agent.access?.noLoginRequired ? 'loginRequiredHelper' : 'noLoginRequiredHelper')}
        </FormHelperText>
      </Stack>
    </Stack>
  );
}

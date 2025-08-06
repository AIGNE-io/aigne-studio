import { PlanAlert } from '@app/components/multi-tenant-restriction/plan-alert';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { FormControl, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';

import { useMultiTenantRestriction } from '../../multi-tenant-restriction';

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

  const pass = quotaChecker.checkAnonymousRequest({ showPrice: false });
  return (
    <Stack
      direction="column"
      sx={{
        px: 1.5,
        py: 1,
        gap: 1,
      }}>
      <Stack
        sx={{
          alignItems: 'flex-start',
        }}>
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
      <Stack
        sx={{
          alignItems: 'flex-start',
        }}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
          }}>
          <FormControl>
            <FormControlLabel
              labelPlacement="start"
              label={t('loginRequired')}
              control={
                <Switch
                  disabled={!pass}
                  size="small"
                  checked={!agent.access?.noLoginRequired}
                  onChange={(_, check) => {
                    if (!pass) return;
                    doc.transact(() => {
                      agent.access ??= {};
                      agent.access.noLoginRequired = !check;
                    });
                  }}
                />
              }
            />
          </FormControl>
        </Stack>
        <FormHelperText sx={{ ml: 0 }}>
          {t(!agent.access?.noLoginRequired ? 'loginRequiredHelper' : 'noLoginRequiredHelper')}
        </FormHelperText>
        {!pass && <PlanAlert sx={{ mt: 0.5 }}>{t('upgradePrompts.anonymousRequest.desc')}</PlanAlert>}
      </Stack>
    </Stack>
  );
}

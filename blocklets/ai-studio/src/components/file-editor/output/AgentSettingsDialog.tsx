import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Switch,
} from '@mui/material';

export default function AgentSettingsDialog({ agent, ...props }: DialogProps & { agent: AssistantYjs }) {
  const { t } = useLocaleContext();

  return (
    <Dialog {...props}>
      <DialogTitle>Agent {t('settings')}</DialogTitle>
      <DialogContent>
        <AgentSettings agent={agent} />
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={(e) => props.onClose?.(e, 'escapeKeyDown')}>
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AgentSettings({ agent }: { agent: AssistantYjs }) {
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

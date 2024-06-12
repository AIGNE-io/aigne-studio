import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputShare } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Checkbox, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

export default function ShareSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as RuntimeOutputShare | undefined;

  const { shareAttachUrl, shareAttachInputs } = initialValue ?? { shareAttachUrl: false, shareAttachInputs: false };

  const checkedVias = new Set(initialValue?.items?.map((i) => i.to) ?? []);

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputShare>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue as RuntimeOutputShare);
    });
  };

  const toggleItemChecked = (item: (typeof SupportedShares)[number], checked: boolean) => {
    setField((value) => {
      value.items ??= [];
      if (checked) {
        value.items.push({ to: item.to });
      } else {
        const index = value.items.findIndex((i) => i.to === item.to);
        if (index >= 0) value.items.splice(index, 1);
      }
    });
  };

  const toggleShareWith = (option: 'shareAttachUrl' | 'shareAttachInputs', checked: boolean) => {
    setField((value) => {
      value[option] = checked;
    });
  };

  return (
    <Stack gap={2}>
      <Stack>
        <Typography variant="subtitle1">{t('share')}</Typography>
        <List dense sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
          {SupportedShares.map((item) => (
            <ListItem key={item.to} sx={{ display: 'flex', flex: '1 0 auto', width: '100px' }}>
              <Checkbox
                checked={checkedVias.has(item.to)}
                onChange={(_, checked) => toggleItemChecked(item, checked)}
              />
              <ListItemText primary={t(item.to)} />
            </ListItem>
          ))}
        </List>
        <Divider sx={{ marginLeft: 3 }} />
        <List dense>
          <ListItem>
            <Checkbox checked={shareAttachUrl} onChange={(_, checked) => toggleShareWith('shareAttachUrl', checked)} />
            <ListItemText primary={t('attachUrl')} />
          </ListItem>
          <ListItem>
            <Checkbox
              checked={shareAttachInputs}
              onChange={(_, checked) => toggleShareWith('shareAttachInputs', checked)}
            />
            <ListItemText primary={t('attachInputs')} />
          </ListItem>
        </List>
      </Stack>
    </Stack>
  );
}

const SupportedShares = [{ to: 'twitter' }, { to: 'copy' }, { to: 'saveAs' }];

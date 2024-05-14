import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputShare } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Checkbox, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

export default function ShareSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as RuntimeOutputShare | undefined;

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

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        <Typography variant="subtitle1">{t('share')}</Typography>

        <List dense>
          {SupportedShares.map((item) => (
            <ListItem key={item.to}>
              <ListItemIcon>
                <Checkbox
                  checked={checkedVias.has(item.to)}
                  onChange={(_, checked) => toggleItemChecked(item, checked)}
                />
              </ListItemIcon>

              <ListItemText primary={t(item.to)} />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Stack>
  );
}

const SupportedShares = [{ to: 'twitter' }, { to: 'copy' }, { to: 'saveAs' }];

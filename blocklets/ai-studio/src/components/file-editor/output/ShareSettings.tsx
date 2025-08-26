import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputShare } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import {
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Stack,
  Typography,
} from '@mui/material';
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
    <Stack sx={{
      gap: 2
    }}>
      <Stack>
        <Typography variant="subtitle2">{t('share')}</Typography>
        <FormControl sx={{ mt: 2, mx: 2 }} component="fieldset" variant="standard">
          <FormLabel component="legend">To</FormLabel>
          <FormGroup sx={{ my: 1 }}>
            {SupportedShares.map((item) => (
              <FormControlLabel
                key={item.to}
                control={
                  <Checkbox
                    sx={{ whiteSpace: 'nowrap' }}
                    checked={checkedVias.has(item.to)}
                    onChange={(_, checked) => toggleItemChecked(item, checked)}
                  />
                }
                label={t(item.to)}></FormControlLabel>
            ))}
          </FormGroup>
        </FormControl>
        <Divider sx={{ mx: 2 }} />
        <FormControl sx={{ mt: 2, mx: 2 }} component="fieldset" variant="standard">
          <FormLabel component="legend">Options</FormLabel>
          <FormGroup sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={shareAttachUrl}
                  onChange={(_, checked) => toggleShareWith('shareAttachUrl', checked)}
                />
              }
              label={t('attachUrl')}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={shareAttachInputs}
                  onChange={(_, checked) => toggleShareWith('shareAttachInputs', checked)}
                />
              }
              label={t('attachInputs')}
            />
          </FormGroup>
        </FormControl>
      </Stack>
    </Stack>
  );
}

export const SupportedShares = [
  { to: 'twitter' },
  { to: 'copy' },
  { to: 'saveAs' },
  { to: 'community' },
  { to: 'link' },
];

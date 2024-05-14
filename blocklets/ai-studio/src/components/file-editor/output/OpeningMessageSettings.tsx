import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputOpeningMessage } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Stack, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

export default function OpeningMessageSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const initialValue = output.initialValue as RuntimeOutputOpeningMessage | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputOpeningMessage>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue as RuntimeOutputOpeningMessage);
    });
  };

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        <Typography variant="subtitle1">{t('openingMessage')}</Typography>

        <TextField
          fullWidth
          hiddenLabel
          multiline
          minRows={2}
          placeholder={t('openingTextPlaceholder')}
          value={initialValue?.message || ''}
          onChange={(e) => setField((v) => (v.message = e.target.value))}
        />
      </Stack>
    </Stack>
  );
}

import { ImageBlenderAssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Stack, TextField, Typography } from '@mui/material';

export default function ImageBlenderAssistantEditor({
  value,
  disabled,
}: {
  value: ImageBlenderAssistantYjs;
  disabled?: boolean;
}) {
  const dynamicDataKeys = ['text', 'qrcode', 'url'];
  const doc = (getYjsValue(value) as Map<any>).doc!;

  const setDynamicData = (key: string, val: string) => {
    doc.transact(() => {
      value.dynamicData ??= {};
      value.dynamicData[key] = val;
    });
  };

  return (
    <Stack gap={2.5}>
      <TextField
        disabled={disabled}
        label="templateId"
        value={value.templateId || ''}
        onChange={(e) => (value.templateId = e.target.value)}
      />

      <Typography>Dynamic Data</Typography>

      {dynamicDataKeys.map((key) => (
        <TextField
          disabled={disabled}
          key={key}
          label={key}
          value={value.dynamicData?.[key]}
          onChange={(e) => setDynamicData(key, e.target.value)}
        />
      ))}
    </Stack>
  );
}

import { getComponent } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RuntimeOutputAppearance } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Alert, Box, CircularProgress, FormLabel, Stack, TextField, TextFieldProps } from '@mui/material';
import { useAsync } from 'react-use';

export default function ComponentSettings({ value }: { value: RuntimeOutputAppearance }) {
  const {
    value: componentState,
    error,
    loading,
  } = useAsync(
    async () => (value.componentId ? getComponent({ componentId: value.componentId }) : undefined),
    [value.componentId]
  );

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const { locale } = useLocaleContext();

  if (error) return <Alert severity="error">{error.message}</Alert>;

  if (loading) {
    return (
      <Box my={4}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!componentState) return null;

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        {componentState.component.properties?.map((item) => (
          <Box key={item.id}>
            <FormLabel>{item.locales?.[locale]?.name || item.locales?.[componentState.defaultLocale!]?.name}</FormLabel>

            <PropertyValueField
              size="small"
              fullWidth
              hiddenLabel
              {...(item.multiline ? { multiline: true, minRows: 2 } : {})}
              value={
                value.componentProps?.[item.id]?.value ??
                item.locales?.[locale]?.defaultValue ??
                item.locales?.[componentState.defaultLocale!]?.defaultValue
              }
              onChange={(e) => {
                doc.transact(() => {
                  value.componentProps ??= {};
                  value.componentProps[item.id] = { value: e.target.value };
                });
              }}
            />
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

function PropertyValueField({ ...props }: TextFieldProps) {
  return <TextField {...props} />;
}

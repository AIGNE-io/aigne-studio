import { UploaderButton, getImageSize, getVideoSize } from '@app/contexts/uploader';
import { Component, getComponent } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { RuntimeOutputAppearance } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { REMOTE_REACT_COMPONENT } from '@blocklet/components-sdk/const';
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material';
import { useAsync } from 'react-use';

export default function ComponentSettings({ value }: { value: RuntimeOutputAppearance }) {
  const {
    value: componentState,
    error,
    loading,
  } = useAsync(
    async () =>
      value.componentId && value.componentId !== REMOTE_REACT_COMPONENT
        ? getComponent({ componentId: value.componentId })
        : undefined,
    [value.componentId]
  );

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const { locale } = useLocaleContext();

  if (error) return <Alert severity="error">{error.message}</Alert>;

  if (loading) {
    return (
      <Box my={4} className="center">
        <CircularProgress size={16} />
      </Box>
    );
  }

  if (!componentState) return null;

  const properties = componentState?.component?.properties || [];

  return (
    <Stack gap={2}>
      <Stack gap={1}>
        {properties?.map((item) => (
          <Stack key={item.id}>
            <Typography variant="subtitle2">
              {item.locales?.[locale]?.name || item.locales?.[componentState.defaultLocale!]?.name}
            </Typography>

            <PropertyValueField
              property={item}
              size="small"
              fullWidth
              hiddenLabel
              {...(item.multiline ? { multiline: true, minRows: 2 } : {})}
              value={
                value.componentProperties?.[item.id]?.value ??
                item.locales?.[locale]?.defaultValue ??
                item.locales?.[componentState.defaultLocale!]?.defaultValue
              }
              onChange={(v) => {
                doc.transact(() => {
                  value.componentProperties ??= {};
                  value.componentProperties[item.id] = { value: v };
                });
              }}
            />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

function PropertyValueField({
  property,
  ...props
}: { property: NonNullable<Component['properties']>[number]; onChange?: (value: any) => void } & Omit<
  TextFieldProps,
  'onChange' | 'property'
>) {
  if (property.type === 'boolean') {
    return <Switch checked={Boolean(props.value) || false} onChange={(_, checked) => props.onChange?.(checked)} />;
  }

  const val = property.type === 'url' ? (props.value as any)?.url : props.value;

  return (
    <TextField
      {...props}
      value={typeof val === 'string' ? val : ''}
      onChange={(e) =>
        props.onChange?.(property.type === 'url' ? { ...(props.value as any), url: e.target.value } : e.target.value)
      }
      InputProps={
        property.type === 'url'
          ? {
              sx: { pr: 0 },
              endAdornment: (
                <InputAdornment position="end">
                  <UploaderButton
                    sx={{ minWidth: 0, minHeight: 0, p: 0 }}
                    onChange={async ({ response }: any) => {
                      const url: string = response?.data?.url || response?.data?.fileUrl;

                      let size: Awaited<ReturnType<typeof getImageSize> | ReturnType<typeof getVideoSize>> | undefined;

                      if (url) {
                        size = await getImageSize(url)
                          .catch(() => getVideoSize(url))
                          .catch(() => undefined);
                      }

                      props.onChange?.({ url, width: size?.naturalWidth, height: size?.naturalHeight });
                    }}
                  />
                </InputAdornment>
              ),
            }
          : undefined
      }
    />
  );
}

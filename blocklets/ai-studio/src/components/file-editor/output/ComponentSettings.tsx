import { useCurrentProject } from '@app/contexts/project';
import { UploaderButton, getImageSize, getVideoSize } from '@app/contexts/uploader';
import { Component, getCustomComponent } from '@app/libs/components';
import { uploadAsset } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearance } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Alert, InputAdornment, Stack, TextField, TextFieldProps, Typography } from '@mui/material';
import { useAsync } from 'react-use';

import Switch from '../../../components/custom/switch';
import { REMOTE_REACT_COMPONENT } from '../../../libs/constants';
import { RemoteComponent } from '../../../libs/type';

export default function ComponentSettings({
  defaultComponent,
  output,
  remoteReact,
}: {
  defaultComponent?: Partial<RuntimeOutputAppearance>;
  output: OutputVariableYjs;
  remoteReact?: RemoteComponent[];
}) {
  const componentId = output.appearance?.componentId || defaultComponent?.componentId;

  if (componentId !== REMOTE_REACT_COMPONENT) {
    return <CustomComponentSettings defaultComponent={defaultComponent} output={output} />;
  }

  if (!output?.appearance) throw new Error('appearance value is required when componentId is remote-react-component');

  return <RemoteReactComponentSettings value={output.appearance} remoteReact={remoteReact} />;
}

function RemoteReactComponentSettings({
  value,
  remoteReact = [],
}: {
  value: RuntimeOutputAppearance;
  remoteReact?: RemoteComponent[];
}) {
  const remote = remoteReact?.find(
    (x) => x.name === value.componentName && x.did === value.componentProperties?.remoteComponentDID?.value
  );

  const doc = (getYjsValue(value) as Map<any>).doc!;

  if (!remote) return null;

  const properties = remote.parameter;

  return (
    <Stack sx={{
      gap: 2
    }}>
      <Stack sx={{
        gap: 1
      }}>
        {Object.keys(properties || {})?.map((key) => {
          const item = properties?.[key];
          if (!item) return null;
          if (!['string', 'number', 'boolean'].includes(item.type)) return null;

          return (
            <Stack key={key}>
              <Typography variant="subtitle2">{item.name ?? key}</Typography>

              <PropsValueField
                label={undefined}
                hiddenLabel
                fullWidth
                size="medium"
                type={item.type}
                value={value.componentProps?.[key]}
                onChange={(defaultValue: any) => {
                  doc.transact(() => {
                    value.componentProps ??= {};
                    value.componentProps[key] = defaultValue;
                  });
                }}
              />
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}

function CustomComponentSettings({
  defaultComponent,
  output,
}: {
  defaultComponent?: Partial<RuntimeOutputAppearance>;
  output: OutputVariableYjs;
}) {
  const componentId = output.appearance?.componentId || defaultComponent?.componentId;

  const {
    value: componentState,
    error,
    loading,
  } = useAsync(
    async () =>
      componentId && componentId !== REMOTE_REACT_COMPONENT ? getCustomComponent({ componentId }) : undefined,
    [componentId]
  );

  const doc = (getYjsValue(output) as Map<any>).doc!;

  const { locale } = useLocaleContext();

  if (error) return <Alert severity="error">{error.message}</Alert>;

  if (loading || !componentState) return null;

  const properties = componentState?.component?.properties || [];

  return (
    <Stack sx={{
      gap: 2
    }}>
      <Stack sx={{
        gap: 1
      }}>
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
                output.appearance?.componentProperties?.[item.id]?.value ??
                item.locales?.[locale]?.defaultValue ??
                item.locales?.[componentState.defaultLocale!]?.defaultValue
              }
              onChange={(v) => {
                doc.transact(() => {
                  output.appearance ??= {};

                  if (!output.appearance.componentId && defaultComponent) {
                    Object.assign(output.appearance, defaultComponent);
                  }

                  output.appearance.componentProperties ??= {};
                  output.appearance.componentProperties[item.id] = { value: v };
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
    return (
      <Switch defaultChecked={Boolean(props.value) || false} onChange={(_, checked) => props.onChange?.(checked)} />
    );
  }

  const val = property.type === 'url' ? (props.value as any)?.url : props.value;

  return (
    <TextField
      {...props}
      value={typeof val === 'string' ? val : ''}
      onChange={(e) =>
        props.onChange?.(property.type === 'url' ? { ...(props.value as any), url: e.target.value } : e.target.value)
      }
      slotProps={{
        input: property.type === 'url'
          ? {
              sx: { pr: 0 },
              endAdornment: (
                <InputAdornment position="end">
                  <Uploader onChange={props.onChange} />
                </InputAdornment>
              ),
            }
          : undefined
      }}
    />
  );
}

function Uploader({ onChange }: { onChange?: (v: { url: string; width?: number; height?: number }) => void }) {
  const { projectId, projectRef } = useCurrentProject();

  return (
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

        const filename = url && (await uploadAsset({ projectId, ref: projectRef, source: url })).filename;

        onChange?.({ url: filename, width: size?.naturalWidth, height: size?.naturalHeight });
      }}
    />
  );
}

function PropsValueField({
  type,
  ...props
}: { type: string; onChange?: (value: any) => void } & Omit<TextFieldProps, 'onChange'>) {
  if (type === 'boolean') {
    return (
      <Switch defaultChecked={Boolean(props.value) || false} onChange={(_, checked) => props.onChange?.(checked)} />
    );
  }

  if (type === 'number') {
    return (
      <TextField
        {...props}
        onChange={(e) => props.onChange?.(Number(e.target.value))}
        slotProps={{
          input: {
            ...props.InputProps,
            inputProps: {
              type: 'number',
              inputMode: 'numeric',
              pattern: '[0-9]*',
              ...props.inputProps,
            },
          }
        }}
      />
    );
  }

  if (type === 'string') {
    return (
      <TextField
        {...props}
        value={typeof props.value === 'string' ? props.value : ''}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    );
  }

  return null;
}

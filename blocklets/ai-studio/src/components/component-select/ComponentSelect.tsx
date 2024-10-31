import { getComponents } from '@app/libs/components';
import { REMOTE_REACT_COMPONENT } from '@app/libs/constants';
import { getOptimizedImageAbsUrl } from '@app/libs/media';
import Empty from '@arcblock/ux/lib/Empty';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { RuntimeDebug } from '@blocklet/aigne-sdk/components/ai-runtime';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Divider,
  Grid,
  Radio,
  RadioGroup,
  Typography,
  styled,
  useRadioGroup,
} from '@mui/material';
import Ajv from 'ajv';
import stringify from 'json-stable-stringify';
import { pick } from 'lodash';
import { ComponentProps, Suspense, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import ErrorBoundary from '../error/error-boundary';
import { generateFakeProps } from './fake-props';
import { useAIGNEApiProps } from './get-agent';

const ajv = new Ajv({ strict: false });

function outputToJsonSchema(output: Record<string, any>) {
  if (!output || output.from?.type === 'input') return {};
  function convert(data: Record<string, any>) {
    const ans: Record<string, any> = { type: data.type ?? 'string' };

    if (data.type === 'object' && data.properties) {
      ans.properties = {};
      for (const [, v] of Object.entries(data.properties)) {
        const value = v as { data: Record<string, any> };
        ans.properties[value.data.name] = convert(value.data);
        if (value.data.required) {
          ans.required = ans.required ?? [];
          ans.required.push(value.data.name);
        }
      }
      return ans;
    }

    if (data.type === 'array' && data.element) {
      ans.items = convert(data.element);
      return ans;
    }

    return ans;
  }
  return convert(output);
}

export interface ComponentSelectValue {
  blockletDid?: string;
  id: string;
  componentProperties?: { componentPath: { value: string }; blockletDid: { value: string } };
  name?: string;
}

export default function ComponentSelect({
  output,
  tags,
  aid,
  value,
  onChange,
}: {
  output: OutputVariableYjs;
  tags: string;
  aid: string;
  value?: ComponentSelectValue | null;
  onChange?: (value: ComponentSelectValue) => void;
}) {
  const { t } = useLocaleContext();
  const [val, setVal] = useState<string | undefined>(() =>
    value ? stringify(pick(value, ['blockletDid', 'id', 'componentProperties'])) : undefined
  );

  useEffect(() => {
    setVal(value ? stringify(pick(value, ['blockletDid', 'id', 'componentProperties'])) : undefined);
  }, [value]);

  const { value: { customComponents = undefined, openComponents = undefined } = {}, loading } = useAsync(
    () => getComponents({ tags }),
    [tags]
  );

  const components = useMemo(() => {
    return [
      ...(customComponents ?? []).map((x) => ({
        value: stringify({ blockletDid: x.blocklet?.did, id: x.id }),
        blockletDid: x.blocklet?.did,
        id: x.id,
        name: x.name,
        description: x.description,
        previewImage: x.previewImage,
        aigneOutputValueSchema: x.aigneOutputValueSchema,
        group: t('buildIn'),
      })),
      ...(openComponents ?? []).map((x) => ({
        value: stringify({
          id: REMOTE_REACT_COMPONENT,
          componentProperties: { componentPath: { value: x.url }, blockletDid: { value: x.did } },
        }),
        id: REMOTE_REACT_COMPONENT,
        name: x.name,
        componentProperties: { componentPath: { value: x.url }, blockletDid: { value: x.did } },
        group: t('remote'),
      })),
    ];
  }, [customComponents, openComponents, t]);

  const componentsMap = useMemo(() => Object.fromEntries(components.map((i) => [i.value, i])), [components]);

  const validatedComponentIds = useMemo(() => {
    if (!output.type) return new Set(components.map((i) => i.id));

    const outputSchema = outputToJsonSchema(output);
    const outputSchemaFakedData = generateFakeProps(outputSchema);
    const validatedComponents =
      components?.filter((i) => {
        const componentSchema = (i as any).aigneOutputValueSchema;
        if (!componentSchema) return true;
        const validate = ajv.compile(componentSchema);
        return validate({ outputValue: outputSchemaFakedData });
      }) ?? [];
    return new Set(validatedComponents.map((i) => i.id).filter(Boolean));
  }, [components, output]);

  const validatedComponents = components.filter((i) => validatedComponentIds.has(i.id));

  return (
    <Grid
      component={RadioGroup}
      name="custom-component"
      value={val}
      onChange={(_, v) => {
        setVal(v);
        onChange?.({ ...JSON.parse(v), name: componentsMap[v]?.name });
      }}
      container
      spacing={2}>
      {validatedComponents.map((i) => (
        <Grid item key={i.value} xs={12} sm={6} md={4}>
          <ComponentSelectItem output={output} aid={aid} customComponent={i} />
        </Grid>
      ))}

      {loading && (
        <Grid item xs={12} py={4} textAlign="center">
          <CircularProgress size={24} />
        </Grid>
      )}
    </Grid>
  );
}

function ComponentSelectItem({
  output,
  aid,
  customComponent,
}: {
  output: OutputVariableYjs;
  aid: string;
  customComponent: {
    value: string;
    blockletDid?: string;
    id: string;
    name?: string;
    description?: string;
    componentProperties?: any;
  };
}) {
  const radioGroup = useRadioGroup();
  const checked = radioGroup?.value === customComponent.value;

  const { t } = useLocaleContext();

  return (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        outline: checked ? '2px solid' : 0,
        outlineColor: 'primary.main',
        cursor: 'pointer',
        ':hover': { boxShadow: 6 },
      }}>
      <Radio
        id={`custom-component-${customComponent.value}`}
        name="custom-component"
        value={customComponent.value}
        checked={checked}
        onChange={(e, checked) => checked && radioGroup?.onChange(e, customComponent.value)}
        sx={{ display: 'none' }}
      />

      <Box component="label" htmlFor={`custom-component-${customComponent.value}`} sx={{ cursor: 'pointer' }}>
        <Box
          component="div"
          p={1}
          role="button"
          // @ts-ignore React types doesn't support inert attribute https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
          inert="ignore">
          <ItemPreviewer output={output} aid={aid} customComponent={customComponent} />
        </Box>
        <Divider />
        <Typography sx={{ m: 1 }} noWrap>
          {customComponent.name || t('unnamed')}
        </Typography>
        <Typography
          sx={{ m: 1, WebkitLineClamp: 2, overflowWrap: 'break-word' }}
          className="multi-line-ellipsis"
          variant="caption"
          title={customComponent.description}>
          {customComponent.description}
        </Typography>
      </Box>
    </Card>
  );
}

function ItemPreviewer({
  output,
  aid,
  customComponent,
}: {
  output: OutputVariableYjs;
  aid: string;
  customComponent: { blockletDid?: string; id: string };
}) {
  if (output.name === RuntimeOutputVariable.appearancePage) {
    return <PageComponentPreviewer aid={aid} customComponent={customComponent} />;
  }

  return <ComponentPreviewImagePreviewer customComponent={customComponent} />;
}

function ComponentPreviewImagePreviewer({
  customComponent,
}: {
  customComponent: {
    id: string;
    name?: string;
    description?: string;
    previewImage?: string;
  };
}) {
  const { t } = useLocaleContext();
  const { previewImage, name } = customComponent;
  return (
    <Box position="relative" paddingBottom="100%">
      <Box position="absolute" left={0} top={0} right={0} bottom={0}>
        {previewImage ? (
          <Box
            component="img"
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
            src={getOptimizedImageAbsUrl(previewImage)}
            alt={name}
          />
        ) : (
          <Empty size={30}>
            <Box sx={{ fontSize: '16px' }}>{t('noPreviewImage')}</Box>
          </Empty>
        )}
      </Box>
    </Box>
  );
}

function PageComponentPreviewer({
  aid,
  customComponent,
}: {
  aid: string;
  customComponent: { blockletDid?: string; id: string; name?: string; componentProperties?: any };
}) {
  const apiProps = useAIGNEApiProps({
    apiUniqueKey: `PageComponentSelectPreviewer-${customComponent.id}`,
    customComponent,
  });

  return (
    <Box position="relative" paddingBottom="120%">
      <ErrorBoundary FallbackComponent={ErrorView}>
        <Suspense
          fallback={
            <Box textAlign="center" my={2}>
              <CircularProgress size={24} />
            </Box>
          }>
          <PreviewerContent>
            <RuntimeDebug hideSessionsBar aid={aid} ApiProps={apiProps} />
          </PreviewerContent>
        </Suspense>
      </ErrorBoundary>
    </Box>
  );
}

function ErrorView({ error }: { error: any }) {
  return <Alert severity="error">{error.message}</Alert>;
}

const PreviewerContent = styled(Box)`
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  width: 200%;
  height: 200%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  transform: scale(0.5);
  transform-origin: top left;
  pointer-events: none;
  user-select: none;
`;

export function ComponentSelectDialog({
  output,
  tags,
  aid,
  value,
  onChange,
  ...props
}: Pick<ComponentProps<typeof ComponentSelect>, 'aid' | 'tags' | 'value' | 'onChange' | 'output'> &
  Omit<DialogProps, 'onChange'>) {
  const [state, setState] = useState<ComponentSelectValue | null>();

  useEffect(() => {
    setState(value);
  }, [props.open]);

  const { t } = useLocaleContext();

  return (
    <Dialog fullWidth maxWidth="md" {...props}>
      <DialogTitle>{t('selectObject', { object: t('appearance') })}</DialogTitle>

      <DialogContent sx={{ minHeight: '40vh' }}>
        <ComponentSelect output={output} tags={tags} aid={aid} value={state} onChange={setState} />
      </DialogContent>

      <DialogActions>
        <Button onClick={(e) => props.onClose?.(e, 'escapeKeyDown')}>{t('cancel')}</Button>
        <Button
          variant="contained"
          onClick={(e) => {
            if (state) onChange?.(state);
            props.onClose?.(e, undefined as any);
          }}>
          {t('ok')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useCurrentProject } from '@app/contexts/project';
import { getComponents, getComponentsByIds } from '@app/libs/components';
import { REMOTE_REACT_COMPONENT } from '@app/libs/constants';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import {
  OutputVariable,
  OutputVariableYjs,
  RuntimeOutputVariable,
  fileFromYjs,
  isAssistant,
  outputVariableFromYjs,
  outputVariablesToJsonSchema,
  variableFromYjs,
} from '@blocklet/ai-runtime/types';
import {
  CurrentMessageOutputProvider,
  CurrentMessageProvider,
  RuntimeDebug,
  RuntimeProvider,
} from '@blocklet/aigne-sdk/components/ai-runtime';
import { CustomComponentRenderer, CustomComponentRendererProvider } from '@blocklet/pages-kit/components';
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
import { nanoid } from 'nanoid';
import { ComponentProps, ReactNode, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import ErrorBoundary from '../error/error-boundary';
import { generateFakeProps } from './fake-props';
import { useAIGNEApiProps } from './get-agent';

const ajv = new Ajv();

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

  const { value: instances } = useAsync(
    () => getComponentsByIds({ componentIds: components.map((i) => i.id) }),
    [components]
  );

  const resolveValidate = useCallback(() => {
    if (!output) return () => false;
    const outputSchema = outputToJsonSchema(output);
    return ajv.compile(outputSchema);
  }, [output]);

  const validatedComponentIds = useMemo(() => {
    const validate = resolveValidate();
    const validatedComponents =
      instances?.filter((instance) => {
        const schema = (instance?.Component as any).outputValueSchema;
        if (!schema) return true;
        const faked = schema ? (generateFakeProps(schema) as any)?.outputValue : null;
        return faked ? validate(faked) : false;
      }) ?? [];
    return new Set(validatedComponents.map((i) => i?.component.id).filter(Boolean));
  }, [instances, resolveValidate]);

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
  customComponent: { value: string; blockletDid?: string; id: string; name?: string; componentProperties?: any };
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

  return <ComponentPreviewer output={output} aid={aid} customComponent={customComponent} />;
}

function ComponentPreviewer({
  output,
  aid,
  customComponent,
}: {
  output: OutputVariableYjs;
  aid: string;
  customComponent: { blockletDid?: string; id: string; name?: string; componentProperties?: any };
}) {
  const { projectId, projectRef } = useCurrentProject();
  const { agentId } = useMemo(() => parseIdentity(aid, { rejectWhenError: true }), [aid]);
  const { getFileById, getVariables } = useProjectStore(projectId, projectRef);

  const agent = getFileById(agentId);
  if (!agent) throw new Error(`No such agent ${agentId}`);
  if (!isAssistant(agent)) throw new Error(`Invalid agent file type ${agentId}`);

  const fakeMessage = useMemo<ComponentProps<typeof CurrentMessageProvider>['message']>(() => {
    const { agentId } = parseIdentity(aid, { rejectWhenError: true });

    const file = fileFromYjs(agent);
    if (!isAssistant(file)) throw new Error(`Invalid agent file type ${agentId}`);

    const outputSchema = outputVariablesToJsonSchema(file, {
      variables: getVariables().variables?.map(variableFromYjs) ?? [],
      includeRuntimeOutputVariables: true,
      includeFaker: true,
    });

    const output = outputSchema ? generateFakeProps(outputSchema) : {};

    return {
      id: nanoid(),
      aid,
      agentId,
      sessionId: nanoid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      outputs: {
        objects: [output as any],
      },
    };
  }, [aid]);

  const api = useAIGNEApiProps({
    apiUniqueKey: `ComponentSelectPreviewer-${customComponent.id}-${output.name}`,
    customComponent,
  });

  const customComponentCtx = useMemo(
    () => ({
      customRendererComponent: FakeMessageOutputValueProvider,
      customRendererComponentProps: { output: outputVariableFromYjs(output) },
    }),
    []
  );

  console.warn(customComponentCtx);

  return (
    <Box position="relative" paddingBottom="100%">
      <Box position="absolute" left={0} top={0} right={0} bottom={0}>
        <ErrorBoundary FallbackComponent={ErrorView}>
          <Suspense
            fallback={
              <Box textAlign="center" my={2}>
                <CircularProgress size={24} />
              </Box>
            }>
            <PreviewerContent>
              <Box
                sx={{
                  position: 'absolute',
                  width: '100%',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                }}>
                <RuntimeProvider aid={aid} working ApiProps={api}>
                  <CurrentMessageProvider message={fakeMessage}>
                    <CustomComponentRendererProvider value={customComponentCtx}>
                      <CustomComponentRenderer componentId={customComponent.id} />
                    </CustomComponentRendererProvider>
                  </CurrentMessageProvider>
                </RuntimeProvider>
              </Box>
            </PreviewerContent>
          </Suspense>
        </ErrorBoundary>
      </Box>
    </Box>
  );
}

function FakeMessageOutputValueProvider({
  output,
  children,
  Component,
}: {
  output: OutputVariable;
  children?: ReactNode;
  // @ts-ignore
  Component: CustomComponentType;
}) {
  const fakeValue = useMemo(
    () =>
      Component.outputValueSchema ? (generateFakeProps(Component.outputValueSchema) as any)?.outputValue : undefined,
    [Component.outputValueSchema]
  );

  return (
    <CurrentMessageOutputProvider output={output} outputValue={fakeValue}>
      {children}
    </CurrentMessageOutputProvider>
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

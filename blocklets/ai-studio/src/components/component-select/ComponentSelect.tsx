import { getComponents } from '@app/libs/components';
import { REMOTE_REACT_COMPONENT } from '@app/libs/constants';
import { getOptimizedImageAbsUrl } from '@app/libs/media';
import Empty from '@arcblock/ux/lib/Empty';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  OutputVariableYjs,
  RuntimeOutputVariable,
  isRuntimeOutputVariable,
  runtimeVariablesSchema,
} from '@blocklet/ai-runtime/types';
import Warning from '@mui/icons-material/WarningAmberOutlined';
import {
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
  Tooltip,
  Typography,
  useRadioGroup,
} from '@mui/material';
import Ajv from 'ajv';
import stringify from 'json-stable-stringify';
import { pick } from 'lodash';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { generateFakeProps } from './fake-props';

const ajv = new Ajv({ strict: false });

function convertCustomOutput(data: Record<string, any>) {
  const ans: Record<string, any> = { type: data.type ?? 'string' };

  if (data.type === 'object' && data.properties) {
    ans.properties = {};
    for (const [, v] of Object.entries(data.properties)) {
      const value = v as { data: Record<string, any> };
      ans.properties[value.data.name] = convertCustomOutput(value.data);
      if (value.data.required) {
        ans.required = ans.required ?? [];
        ans.required.push(value.data.name);
      }
    }
    return ans;
  }

  if (data.type === 'array' && data.element) {
    ans.items = convertCustomOutput(data.element);
    return ans;
  }

  return ans;
}

function convertRuntimeOutput(data: Record<string, any>) {
  const ans: Record<string, any> = { type: data.type ?? 'string' };
  if (data.type === 'object' && data.properties) {
    ans.properties = {};
    for (const i of data.properties) {
      ans.properties[i.name] = convertRuntimeOutput(i);
      if (i.required) {
        ans.required = ans.required ?? [];
        ans.required.push(i.name);
      }
    }
    return ans;
  }

  if (data.type === 'array' && data.element) {
    ans.items = convertRuntimeOutput(data.element);
    return ans;
  }

  return ans;
}

function outputToJsonSchema(output: Record<string, any>) {
  if (!output || output.from?.type === 'input') return {};

  if (output.name && isRuntimeOutputVariable(output.name)) {
    const schema = runtimeVariablesSchema[output.name as RuntimeOutputVariable];
    return schema ? convertRuntimeOutput(schema) : {};
  }

  return convertCustomOutput(output);
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
  value,
  onChange,
}: {
  output: OutputVariableYjs;
  tags: string;
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

  const validatedComponents = useMemo(() => {
    const isOutputFromInput = output.from?.type === 'input';
    const outputSchema = outputToJsonSchema(output);
    const outputSchemaFakedData = generateFakeProps(outputSchema);
    const validated =
      components?.reduce(
        (acc, i) => {
          const componentSchema = (i as any).aigneOutputValueSchema;
          if (!componentSchema) {
            acc.withoutSchema.push(i);
            return acc;
          }

          // If the output comes from the input, we do not know the schema of the output.
          if (isOutputFromInput) {
            acc.withSchema.push(i);
            return acc;
          }

          const validate = ajv.compile(componentSchema);
          if (validate({ outputValue: outputSchemaFakedData })) acc.withSchema.push(i);
          return acc;
        },
        { withSchema: [], withoutSchema: [] } as { withSchema: any[]; withoutSchema: any[] }
      ) ?? {};
    return [...validated.withSchema, ...validated.withoutSchema];
  }, [components, output]);

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
        <Grid
          key={i.value}
          size={{
            xs: 12,
            sm: 6,
            md: 4
          }}>
          <ComponentSelectItem output={output} customComponent={i} />
        </Grid>
      ))}
      {loading && (
        <Grid
          size={12}
          sx={{
            py: 4,
            textAlign: "center"
          }}>
          <CircularProgress size={24} />
        </Grid>
      )}
    </Grid>
  );
}

function ComponentSelectItem({
  output,
  customComponent,
}: {
  output: OutputVariableYjs;
  customComponent: {
    value: string;
    blockletDid?: string;
    id: string;
    name?: string;
    description?: string;
    componentProperties?: any;
    aigneOutputValueSchema?: Record<string, any>;
  };
}) {
  const radioGroup = useRadioGroup();
  const checked = radioGroup?.value === customComponent.value;

  const { t } = useLocaleContext();

  const ignoreAigneOutputValueSchema = [
    RuntimeOutputVariable.appearancePage,
    RuntimeOutputVariable.appearanceInput,
    RuntimeOutputVariable.appearanceOutput,
  ];

  const hasNoOutputValueSchema =
    !customComponent.aigneOutputValueSchema &&
    !ignoreAigneOutputValueSchema.includes(output.name as RuntimeOutputVariable);

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
          role="button"
          // @ts-ignore React types doesn't support inert attribute https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert
          inert="ignore"
          sx={{
            p: 1
          }}>
          <ComponentPreviewImagePreviewer customComponent={customComponent} />
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ m: 1 }} noWrap>
            {customComponent.name || t('unnamed')}
          </Typography>
          {hasNoOutputValueSchema && (
            <Tooltip title={t('noOutputValueSchema')}>
              <Warning fontSize="small" sx={{ color: 'warning.main', fontSize: 16, mr: 1 }} />
            </Tooltip>
          )}
        </Box>
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

function ComponentPreviewImagePreviewer({
  customComponent,
}: {
  customComponent: {
    id: string;
    name?: string;
    description?: string;
    previewImage?: string;
    aigneOutputValueSchema?: Record<string, any>;
  };
}) {
  const { t } = useLocaleContext();
  const { previewImage, name } = customComponent;

  return (
    <Box
      sx={{
        position: "relative",
        paddingBottom: "100%"
      }}>
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        }}>
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

export function ComponentSelectDialog({
  output,
  tags,
  value,
  onChange,
  ...props
}: Pick<ComponentProps<typeof ComponentSelect>, 'tags' | 'value' | 'onChange' | 'output'> &
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
        <ComponentSelect output={output} tags={tags} value={state} onChange={setState} />
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

import { useCurrentProject } from '@app/contexts/project';
import { getComponents } from '@app/libs/components';
import { REMOTE_REACT_COMPONENT } from '@app/libs/constants';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { parseIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_COMPONENTS_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { RuntimeOutputVariable, fileFromYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { RuntimeDebug } from '@blocklet/pages-kit/builtin/async/ai-runtime';
import { getAgent } from '@blocklet/pages-kit/builtin/async/ai-runtime/api/agent';
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
  Typography,
  styled,
  useRadioGroup,
} from '@mui/material';
import stringify from 'json-stable-stringify';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';
import { ComponentProps, Suspense, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

export interface ComponentSelectValue {
  blockletDid?: string;
  id: string;
  componentProperties?: { componentPath: { value: string }; blockletDid: { value: string } };
  name?: string;
}

export default function ComponentSelect({
  tags,
  aid,
  value,
  onChange,
}: {
  tags: string;
  aid: string;
  value?: ComponentSelectValue | null;
  onChange?: (value: ComponentSelectValue) => void;
}) {
  const { t } = useLocaleContext();
  const [val, setVal] = useState<string | undefined>(() =>
    value ? stringify(pick(value, ['blockletDid', 'id', 'componentProperties'])) : undefined
  );

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
  }, [customComponents, openComponents]);

  const componentsMap = useMemo(() => Object.fromEntries(components.map((i) => [i.value, i])), [components]);

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
      {components.map((i) => (
        <Grid item key={i.value} xs={12} sm={6} md={4}>
          <ComponentSelectItem aid={aid} customComponent={i} />
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
  aid,
  customComponent,
}: {
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
        <ComponentPreviewer aid={aid} customComponent={customComponent} />

        <Divider />

        <Typography sx={{ m: 1 }} noWrap>
          {customComponent.name || t('unnamed')}
        </Typography>
      </Box>
    </Card>
  );
}

function ComponentPreviewer({
  aid,
  customComponent,
}: {
  aid: string;
  customComponent: { blockletDid?: string; id: string; name?: string; componentProperties?: any };
}) {
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting, getFileById } = useProjectStore(projectId, projectRef);

  const getAgentYjs: NonNullable<ComponentProps<typeof RuntimeDebug>['ApiProps']>['getAgent'] = async ({ aid }) => {
    const identity = parseIdentity(aid, { rejectWhenError: true });

    if (identity.projectId === projectId) {
      const { agentId } = identity;
      const agent = getFileById(agentId);
      if (!agent) throw new Error(`No such agent ${agentId}`);

      const convertToAgent = () => {
        const file = fileFromYjs((getYjsValue(agent) as Map<any>).toJSON());
        if (!isAssistant(file)) throw new Error(`Invalid agent file type ${agentId}`);

        file.outputVariables ??= [];

        let appearancePage = file.outputVariables.find((i) => i.name === RuntimeOutputVariable.appearancePage);
        if (!appearancePage) {
          appearancePage = {
            id: nanoid(),
            name: RuntimeOutputVariable.appearancePage,
          };
          file.outputVariables.push(appearancePage);
        }

        appearancePage.appearance = {
          componentBlockletDid: AIGNE_COMPONENTS_COMPONENT_DID,
          componentId: customComponent.id,
          componentName: customComponent.name,
        };

        return {
          ...file,
          project: projectSetting,
          config: {
            // TODO: get secrets
            secrets: [],
          },
        };
      };

      return {
        ...convertToAgent(),
        // TODO: throttle the update
        observe: (listener) => {
          const yjs = getYjsValue(agent) as Map<any>;
          const observer = () => listener(convertToAgent());
          yjs.observeDeep(observer);
          return () => yjs.unobserveDeep(observer);
        },
      };
    }

    return getAgent({ aid, working: true });
  };

  return (
    <Box position="relative" paddingBottom="120%" sx={{ pointerEvents: 'none' }}>
      <PreviewerContent>
        <Suspense
          fallback={
            <Box textAlign="center" my={2}>
              <CircularProgress size={40} />
            </Box>
          }>
          <RuntimeDebug
            hideSessionsBar
            aid={aid}
            ApiProps={{ apiUniqueKey: `ComponentSelectPreviewer-${customComponent.id}`, getAgent: getAgentYjs }}
          />
        </Suspense>
      </PreviewerContent>
    </Box>
  );
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
  tags,
  aid,
  value,
  onChange,
  ...props
}: Pick<ComponentProps<typeof ComponentSelect>, 'aid' | 'tags' | 'value' | 'onChange'> &
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
        <ComponentSelect tags={tags} aid={aid} value={state} onChange={setState} />
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

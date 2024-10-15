import { ComponentSelectDialog, ComponentSelectValue } from '@app/components/component-select/ComponentSelect';
import { useCurrentProject } from '@app/contexts/project';
import { REMOTE_REACT_COMPONENT } from '@app/libs/constants';
import { RemoteComponent } from '@app/libs/type';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_COMPONENTS_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import {
  AssistantYjs,
  OutputVariableYjs,
  RuntimeOutputAppearance,
  RuntimeOutputVariable,
} from '@blocklet/ai-runtime/types';
import { getDefaultOutputComponent } from '@blocklet/aigne-sdk/components';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import {
  Autocomplete,
  AutocompleteProps,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { WritableDraft } from 'immer';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { getCustomComponents, getOpenComponents } from '../../../libs/components';
import ComponentSettings from './ComponentSettings';

const ignoreAppearanceSettingsOutputs = new Set<string>([RuntimeOutputVariable.children]);

const ignoreIconTitleSettingsOutputs = new Set<string>([
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.profile,
]);

export default function AppearanceComponentSettings({
  agent,
  output,
  disableTitleAndIcon,
}: {
  agent: AssistantYjs;
  output: OutputVariableYjs;
  disableTitleAndIcon?: boolean;
}) {
  const { projectId, projectRef } = useCurrentProject();
  const { t } = useLocaleContext();

  const aid = stringifyIdentity({ projectId, projectRef, agentId: agent.id });

  const { appearance } = output;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputAppearance>) => void) => {
    doc.transact(() => {
      if (typeof output.appearance !== 'object') output.appearance = {};
      update(output.appearance);
    });
  };

  const { tags } = useMemo(() => {
    const m: { [key: string]: { tags: string } } = {
      [RuntimeOutputVariable.appearancePage]: { tags: 'aigne-page,aigne-layout' },
      [RuntimeOutputVariable.appearanceInput]: { tags: 'aigne-input' },
      [RuntimeOutputVariable.appearanceOutput]: { tags: 'aigne-output' },
    };

    return m[output.name!] || { title: t('appearance'), tags: 'aigne-view' };
  }, [output.name]);

  const { value: remoteReact } = useAsync(
    async () =>
      getOpenComponents().then((components) =>
        components.filter((component) => (component?.tags || []).some((tag) => tags.includes(tag)))
      ),
    [tags]
  );

  const componentSelectState = usePopupState({ variant: 'dialog' });

  if (ignoreAppearanceSettingsOutputs.has(output.name!)) return null;

  const defaultOutputComponent = getDefaultOutputComponent(output);
  const defaultComponent:
    | Required<Pick<RuntimeOutputAppearance, 'componentBlockletDid' | 'componentId' | 'componentName'>>
    | undefined = defaultOutputComponent && {
    componentBlockletDid: AIGNE_COMPONENTS_COMPONENT_DID,
    componentId: defaultOutputComponent.componentId,
    componentName: defaultOutputComponent.componentName,
  };

  const currentComponent = appearance?.componentId
    ? {
        blockletDid: appearance.componentBlockletDid,
        id: appearance.componentId,
        name: appearance.componentName,
      }
    : defaultComponent
      ? {
          blockletDid: AIGNE_COMPONENTS_COMPONENT_DID,
          id: defaultComponent.componentId,
          name: defaultComponent.componentName,
        }
      : null;

  return (
    <Box>
      <Stack gap={1}>
        {!ignoreIconTitleSettingsOutputs.has(output.name!) && !disableTitleAndIcon && (
          <>
            <Divider textAlign="left" sx={{ mt: 2 }}>
              {t('iconAndTitle')}
            </Divider>

            <Box>
              <Typography variant="subtitle2">{t('icon')}</Typography>
              <TextField
                fullWidth
                hiddenLabel
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box component={Icon} icon={appearance?.icon || ''} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" href="https://icon-sets.iconify.design" target="_blank">
                        <Box component={Icon} icon="tabler:search" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                placeholder={t('appearanceIconPlaceholder')}
                value={appearance?.icon || ''}
                onChange={(e) =>
                  setField((c) => {
                    c.icon = e.target.value;
                  })
                }
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('title')}</Typography>
              <TextField
                fullWidth
                hiddenLabel
                placeholder={t('appearanceTitlePlaceholder')}
                value={appearance?.title || ''}
                onChange={(e) =>
                  setField((c) => {
                    c.title = e.target.value;
                  })
                }
              />
            </Box>
          </>
        )}

        <Divider textAlign="left" sx={{ mt: 2 }}>
          {t('appearance')}
        </Divider>

        <Box>
          <Typography variant="subtitle2">{t('selectCustomComponent')}</Typography>

          {output.name === RuntimeOutputVariable.appearancePage ? (
            <>
              <TextField
                fullWidth
                InputProps={{ readOnly: true }}
                value={currentComponent?.name || currentComponent?.id}
                onClick={() => componentSelectState.open()}
              />

              <ComponentSelectDialog
                aid={aid}
                tags={tags}
                value={currentComponent}
                onChange={(v) => {
                  setField((config) => {
                    config.componentBlockletDid = v.blockletDid;
                    config.componentId = v.id;
                    config.componentProperties = v.componentProperties;
                    config.componentName = v.name;
                  });
                }}
                {...bindDialog(componentSelectState)}
              />
            </>
          ) : (
            <ComponentSelectAutoComplete
              tags={tags}
              remoteReact={remoteReact || []}
              value={currentComponent}
              onChange={(_, v) =>
                setField((config) => {
                  config.componentBlockletDid = v?.blockletDid;
                  config.componentId = v?.id;
                  config.componentName = v?.name;
                  config.componentProperties = v?.componentProperties;
                })
              }
            />
          )}
        </Box>

        {currentComponent && (
          <ComponentSettings defaultComponent={defaultComponent} output={output} remoteReact={remoteReact} />
        )}
      </Stack>
    </Box>
  );
}

function ComponentSelectAutoComplete({
  tags,
  remoteReact = [],
  ...props
}: {
  tags?: string;
  remoteReact?: RemoteComponent[];
} & Partial<
  AutocompleteProps<
    Pick<ComponentSelectValue, 'id' | 'name'> & { blockletDid?: string; componentProperties?: {}; group?: string },
    false,
    false,
    false
  >
>) {
  const { value, loading } = useAsync(() => getCustomComponents({ tags }), [tags]);
  const { t } = useLocaleContext();

  const components = useMemo(() => {
    return [
      ...(value?.components || []).map((x) => ({
        blockletDid: x.blocklet?.did,
        id: x.id,
        name: x.name,
        group: t('buildIn'),
      })),
      ...(remoteReact || []).map((x) => ({
        id: REMOTE_REACT_COMPONENT,
        name: x.name,
        componentProperties: { componentPath: { value: x.url }, blockletDid: { value: x.did } },
        group: t('remote'),
      })),
    ];
  }, [value, remoteReact]);

  return (
    <Autocomplete
      groupBy={(option) => option.group || ''}
      options={components}
      loading={loading}
      {...props}
      renderInput={(params) => <TextField hiddenLabel {...params} />}
      getOptionLabel={(component) =>
        component.blockletDid ? component.name || component.id : `${component.name || component.id} (Local)`
      }
      isOptionEqualToValue={
        (o, v) =>
          o.id === v.id &&
          ((!o.blockletDid && !v.blockletDid) || o.blockletDid === v.blockletDid) &&
          (o.id !== REMOTE_REACT_COMPONENT || o.name === v.name) // FIXME: 临时解决方案，等后端返回 name 字段后可以删掉
      }
      renderGroup={(params) => {
        return (
          <Box key={params.key}>
            <Typography p={2} py={1} pl={1} lineHeight="20px" color="#9CA3AF">
              {params.group}
            </Typography>
            <Box>{params.children}</Box>
          </Box>
        );
      }}
    />
  );
}

import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AIGNE_COMPONENTS_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
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
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { getOpenComponents } from '../../../libs/components';
import { REMOTE_REACT_COMPONENT } from '../../../libs/constants';
import { RemoteComponent } from '../../../libs/type';
import ComponentSettings from './ComponentSettings';

const ignoreAppearanceSettingsOutputs = new Set<string>([RuntimeOutputVariable.children]);

const ignoreIconTitleSettingsOutputs = new Set<string>([
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.profile,
]);

export default function AppearanceComponentSettings({
  output,
  disableTitleAndIcon,
}: {
  output: OutputVariableYjs;
  disableTitleAndIcon?: boolean;
}) {
  const { t } = useLocaleContext();

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
          <ComponentSelect
            tags={tags}
            remoteReact={remoteReact || []}
            value={currentComponent}
            onChange={(_, v) =>
              setField((config) => {
                config.componentBlockletDid = v?.blockletDid;
                config.componentId = v?.id;
                config.componentName = v?.name;

                if (config.componentProperties) delete config.componentProperties;
                if (config.componentProps) delete config.componentProps;
                if (v?.id === REMOTE_REACT_COMPONENT)
                  config.componentProperties = Object.fromEntries(
                    Object.entries(v.componentProperties || {}).map(([key, value]) => [key, { value }])
                  );
              })
            }
          />
        </Box>

        {currentComponent && (
          <ComponentSettings defaultComponent={defaultComponent} output={output} remoteReact={remoteReact} />
        )}
      </Stack>
    </Box>
  );
}

function ComponentSelect({
  tags,
  remoteReact = [],
  ...props
}: {
  tags?: string;
  remoteReact?: RemoteComponent[];
} & Partial<
  AutocompleteProps<
    Pick<Component, 'id' | 'name'> & { blockletDid?: string; componentProperties?: {}; group?: string },
    false,
    false,
    false
  >
>) {
  const { value, loading } = useAsync(() => getComponents({ tags }), [tags]);
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
        componentProperties: { componentPath: x.url, blockletDid: x.did },
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

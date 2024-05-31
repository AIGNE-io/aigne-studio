import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { REMOTE_REACT_COMPONENT } from '@blocklet/components-sdk/const';
import { RemoteComponent } from '@blocklet/components-sdk/type';
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
import pick from 'lodash/pick';
import { useEffect, useMemo } from 'react';
import { useAsync } from 'react-use';

import { getDynamicReactComponents } from '../../../libs/components';
import ComponentSettings from './ComponentSettings';

const ignoreAppearanceSettingsOutputs = new Set<string>([RuntimeOutputVariable.children]);

const ignoreIconTitleSettingsOutputs = new Set<string>([
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.profile,
]);

export default function AppearanceSettings({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const { appearance } = output;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputAppearance>) => void) => {
    doc.transact(() => {
      if (typeof output.appearance !== 'object') output.appearance = {};
      update(output.appearance);
    });
  };

  // 兼容旧版本数据，2024-06-23 之后可以删掉
  useEffect(() => {
    if (!output.appearance && (output.initialValue as any)?.componentId) {
      setField((appearance) => {
        const {
          componentId,
          componentName,
          componentProps: props,
        } = (pick(output.initialValue, 'componentId', 'componentName', 'componentProps') as any) ?? {};

        Object.assign(appearance, {
          componentId,
          componentName,
          componentProperties: props ? JSON.parse(JSON.stringify(props)) : undefined,
        });
      });
    }
  }, []);

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
      getDynamicReactComponents().then((components) =>
        components.filter((component) => (component?.tags || []).some((tag) => tags.includes(tag)))
      ),
    [tags]
  );

  if (ignoreAppearanceSettingsOutputs.has(output.name!)) return null;

  return (
    <Box>
      <Stack gap={1}>
        {!ignoreIconTitleSettingsOutputs.has(output.name!) && (
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
            value={
              appearance?.componentId
                ? {
                    blockletDid: appearance.componentBlockletDid,
                    id: appearance.componentId,
                    name: appearance.componentName,
                  }
                : null
            }
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

        {appearance?.componentId && <ComponentSettings value={appearance} remoteReact={remoteReact} />}
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
        componentProperties: {
          componentPath: x.url,
          blockletDid: x.did,
        },
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
      getOptionLabel={(component) => component.name || component.id}
      isOptionEqualToValue={(o, v) => `${o.id}-${o.name}` === `${v.id}-${v.name}`}
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

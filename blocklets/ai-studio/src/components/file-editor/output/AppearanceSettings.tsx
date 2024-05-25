import { Component, getComponents } from '@app/libs/components';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { REMOTE_REACT_COMPONENT } from '@blocklet/components-sdk/const';
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
import { cloneDeep } from 'lodash';
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
  console.log(cloneDeep(appearance));

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
            value={appearance?.componentId ? { id: appearance.componentId, name: appearance.componentName } : undefined}
            onChange={(_, v) =>
              setField((config) => {
                config.componentId = v?.id;
                config.componentName = v?.name;

                if (config.componentProperties) delete config.componentProperties;
                if (v?.id === REMOTE_REACT_COMPONENT) config.componentProperties = { value: v.componentProperties };
              })
            }
          />
        </Box>

        {appearance?.componentId && <ComponentSettings value={appearance} />}
      </Stack>
    </Box>
  );
}

function ComponentSelect({
  tags,
  ...props
}: { tags?: string } & Partial<
  AutocompleteProps<Pick<Component, 'id' | 'name'> & { componentProperties?: {}; group?: string }, false, false, false>
>) {
  const { value, loading } = useAsync(() => getComponents({ tags }), [tags]);
  const { value: remoteReact, loading: remoteLoading } = useAsync(
    async () => ((tags || '')?.includes('aigne-view') ? getDynamicReactComponents() : undefined),
    [tags]
  );

  const components = useMemo(() => {
    return [
      ...(value?.components || []).map((x) => ({ id: x.id, name: x.name, group: 'buildIn' })),
      ...(remoteReact || []).map((x) => ({
        id: REMOTE_REACT_COMPONENT,
        name: x.name,
        componentProperties: {
          remoteComponentPath: x.path,
          remoteComponentDID: x.did,
        },
        group: 'remote',
      })),
    ];
  }, [value, remoteReact]);

  return (
    <Autocomplete
      groupBy={(option) => option.group || ''}
      options={components}
      loading={loading || remoteLoading}
      {...props}
      renderInput={(params) => <TextField hiddenLabel {...params} />}
      getOptionLabel={(component) => component.name || component.id}
      isOptionEqualToValue={(o, v) => `${o.id}-${o.name}` === `${v.id}-${v.name}`}
      renderGroup={(params) => {
        return (
          <Box key={params.key}>
            <Typography p={2} py={1} fontSize="14px" lineHeight="20px" color="#9CA3AF">
              {params.group}
            </Typography>
            <Box>{params.children}</Box>
          </Box>
        );
      }}
    />
  );
}

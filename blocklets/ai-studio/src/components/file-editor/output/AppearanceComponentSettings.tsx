import { ComponentSelectDialog } from '@app/components/component-select/ComponentSelect';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AIGNE_COMPONENTS_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { OutputVariableYjs, RuntimeOutputAppearance, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { getDefaultOutputComponent } from '@blocklet/aigne-sdk/components/ai-runtime';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { Box, Divider, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { getOpenComponents } from '../../../libs/components';
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
          {t('transform')}
        </Divider>

        <TextField
          label="JSONata Expression"
          multiline
          minRows={2}
          fullWidth
          value={output.appearance?.jsonataExpression || ''}
          onChange={(e) =>
            setField((s) => {
              s.jsonataExpression = e.target.value;
            })
          }
        />

        <Divider textAlign="left" sx={{ mt: 2 }}>
          {t('appearance')}
        </Divider>

        <Box>
          <Typography variant="subtitle2">{t('selectCustomComponent')}</Typography>

          <TextField
            fullWidth
            InputProps={{ readOnly: true }}
            value={currentComponent?.name || currentComponent?.id}
            onClick={() => componentSelectState.open()}
          />

          <ComponentSelectDialog
            output={output}
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
        </Box>

        {currentComponent && (
          <ComponentSettings defaultComponent={defaultComponent} output={output} remoteReact={remoteReact} />
        )}
      </Stack>
    </Box>
  );
}

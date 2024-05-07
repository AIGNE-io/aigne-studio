import PopperMenu from '@app/components/menu/PopperMenu';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable, VariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import DotsIcon from '@iconify-icons/tabler/dots';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import sortBy from 'lodash/sortBy';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useId, useState } from 'react';

import SelectVariable from '../select-variable';
import AppearanceSettings from './AppearanceSettings';
import ChildrenSettings from './ChildrenSettings';
import { getRuntimeOutputVariable } from './type';

export default function OutputActionsCell({
  depth,
  output,
  variable,
  projectId,
  gitRef,
  assistant,
  disabled,
  onRemove,
}: {
  depth: number;
  output: OutputVariableYjs;
  variable?: VariableYjs;
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  disabled?: boolean;
  onRemove?: () => void;
}) {
  const doc = (getYjsValue(output) as Map<any>).doc!;

  const v = variable?.type ?? output;

  const runtimeVariable = getRuntimeOutputVariable(output);

  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();
  const variables = (variableYjs?.variables || []).filter((x) => x.type?.type === output.type);

  return (
    <Stack direction="row" gap={1} justifyContent="flex-end">
      {v.type === 'object' && (
        <Button
          sx={{ minWidth: 24, minHeight: 24, p: 0 }}
          disabled={Boolean(output.variable?.key)}
          onClick={() => {
            doc.transact(() => {
              v.properties ??= {};
              const id = nanoid();
              v.properties[id] = {
                index: Object.values(v.properties).length,
                data: { id, type: 'string' },
              };
              sortBy(Object.values(v.properties), 'index').forEach((item, index) => (item.index = index));
            });
          }}>
          <Icon icon={PlusIcon} />
        </Button>
      )}

      <PopperButton
        projectId={projectId}
        gitRef={gitRef}
        assistant={assistant}
        isSaveAs={Boolean(depth === 0 && !runtimeVariable)}
        runtimeVariable={Boolean(runtimeVariable)}
        variables={variables}
        variable={variable}
        output={output}
        onDelete={onRemove}
        disabled={Boolean(disabled)}
      />
    </Stack>
  );
}

function PopperButton({
  projectId,
  gitRef,
  assistant,
  variables,
  variable,
  isSaveAs,
  runtimeVariable,
  output,
  disabled,
  onDelete,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  variables: VariableYjs[];
  variable?: VariableYjs;
  isSaveAs: boolean;
  runtimeVariable: boolean;
  output: OutputVariableYjs;
  disabled: boolean;
  onDelete?: () => void;
}) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  const [currentSetting, setSetting] = useState<'setting' | 'save'>('setting');

  const renderParameterSettings = (output: OutputVariableYjs) => {
    if (
      [
        RuntimeOutputVariable.appearancePage,
        RuntimeOutputVariable.appearanceInput,
        RuntimeOutputVariable.appearanceOutput,
      ].includes(output.name as RuntimeOutputVariable)
    ) {
      return <AppearanceSettings output={output} />;
    }

    if (output.name === RuntimeOutputVariable.children) {
      return <ChildrenSettings assistant={assistant} projectId={projectId} gitRef={gitRef} output={output} />;
    }

    if (currentSetting === 'setting') {
      return (
        <>
          {runtimeVariable ? null : output.type === 'string' ? (
            <Box>
              <Typography variant="subtitle2">{t('defaultValue')}</Typography>

              <TextField
                disabled={Boolean(disabled)}
                hiddenLabel
                fullWidth
                multiline
                placeholder={t('outputParameterDefaultValuePlaceholder')}
                value={output.defaultValue || ''}
                onChange={(e) => (output.defaultValue = e.target.value)}
              />
            </Box>
          ) : output.type === 'number' ? (
            <Box>
              <Typography variant="subtitle2">{t('defaultValue')}</Typography>

              <NumberField
                disabled={Boolean(disabled)}
                hiddenLabel
                fullWidth
                placeholder={t('outputParameterDefaultValuePlaceholder')}
                value={output.defaultValue || ''}
                onChange={(value) => (output.defaultValue = value)}
              />
            </Box>
          ) : null}
        </>
      );
    }

    if (currentSetting === 'save') {
      return (
        <Box>
          <Typography variant="subtitle2" mb={0}>
            {t('memory.saveMemory')}
          </Typography>

          <Box>
            <SelectVariable
              placeholder={t('selectMemoryPlaceholder')}
              variables={variables}
              variable={variable}
              onDelete={() => {
                if (output.variable) delete output.variable;
              }}
              onChange={(_value) => {
                if (_value && output) {
                  output.variable = { key: _value.key, scope: _value.scope || '' };
                }
              }}
            />
          </Box>
        </Box>
      );
    }

    return null;
  };

  const isRenderSettings = runtimeVariable ? true : ['string', 'number'].includes(output.type || '');

  return (
    <>
      <PopperMenu
        ButtonProps={{
          sx: { minWidth: 0, p: 0.5, ml: -0.5 },
          ...bindTrigger(parameterSettingPopperState),
          disabled,
          children: <Box component={Icon} icon={DotsIcon} sx={{ color: '#3B82F6' }} />,
        }}
        PopperProps={{ placement: 'bottom-end' }}>
        {isRenderSettings && (
          <MenuItem
            onClick={() => {
              setSetting('setting');
              dialogState.open();
            }}>
            {t('setting')}
          </MenuItem>
        )}

        {isSaveAs && (
          <MenuItem
            onClick={() => {
              setSetting('save');
              dialogState.open();
            }}>
            {t('saveAs')}
          </MenuItem>
        )}
        {onDelete && (
          <MenuItem sx={{ color: '#E11D48', fontSize: 13 }} onClick={onDelete}>
            {t('delete')}
          </MenuItem>
        )}
      </PopperMenu>

      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={(e) => e.preventDefault()}>
        <DialogTitle className="between">
          <Box>{t('setting')}</Box>

          <IconButton size="small" onClick={dialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack gap={1.5}>{renderParameterSettings(output)}</Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="contained" onClick={dialogState.close}>
            {t('ok')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

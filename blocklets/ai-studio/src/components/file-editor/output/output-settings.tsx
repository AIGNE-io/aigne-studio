import BaseSwitch from '@app/components/custom/switch';
import PopperMenu from '@app/components/menu/PopperMenu';
import { useProjectStore } from '@app/pages/project/yjs-state';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable, VariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  ListItemIcon,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material';
import { sortBy } from 'lodash';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useId, useState } from 'react';
import React from 'react';

import SelectVariable from '../select-variable';
import AddOutputVariableButton from './AddOutputVariableButton';
import { getRuntimeOutputVariable } from './type';

export default function OutputSettings({
  value,
  projectId,
  gitRef,
}: {
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();

  const outputVariables = value.outputVariables && sortBy(Object.values(value.outputVariables), 'index');

  const doc = (getYjsValue(value) as Map<any>).doc!;

  const setField = (update: (outputVariables: NonNullable<AssistantYjs['outputVariables']>) => void) => {
    doc.transact(() => {
      value.outputVariables ??= {};
      update(value.outputVariables);
      sortBy(Object.values(value.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
  };

  return (
    <Box sx={{ background: '#F9FAFB', py: 1.5, px: 2, borderRadius: 1 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <Box component={Icon} icon="tabler:arrow-autofit-down" />
          <Typography variant="subtitle2" mb={0}>
            {t('outputs')}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ border: '1px solid #E5E7EB', bgcolor: '#fff', borderRadius: 1, py: 1, px: 1.5, overflow: 'auto' }}>
        <Box
          sx={{
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            table: {
              'th,td': { py: 0, px: 0, '&:not(:first-of-type)': { pl: 1 } },
              th: { pb: 0.5 },
            },
          }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <Box component={TableCell} width="30%">
                  {t('name')}
                </Box>
                <Box component={TableCell}>{t('description')}</Box>
                <Box component={TableCell}>{t('format')}</Box>
                <Box component={TableCell} align="right" />
              </TableRow>
            </TableHead>

            <TableBody
              sx={{
                'tr>td': {},
              }}>
              {outputVariables?.map((variable) => (
                <VariableRow
                  key={variable.data.id}
                  variable={variable.data}
                  value={value}
                  projectId={projectId}
                  gitRef={gitRef}
                  onRemove={() =>
                    setField(() => {
                      delete value.outputVariables?.[variable.data.id];
                    })
                  }
                />
              ))}
            </TableBody>
          </Table>
        </Box>

        {value.type !== 'image' && (
          <AddOutputVariableButton
            assistant={value}
            onSelect={({ name }) => {
              setField((vars) => {
                const exist = name ? outputVariables?.find((i) => i.data.name === name) : undefined;
                if (exist) {
                  delete vars[exist.data.id];
                } else {
                  const id = nanoid();
                  vars[id] = { index: Object.values(vars).length, data: { id, name, type: 'string' } };
                }

                sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
              });
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function VariableRow({
  parent,
  value,
  variable,
  depth = 0,
  onRemove,
  projectId,
  gitRef,
  disabled,
}: {
  parent?: OutputVariableYjs;
  value: AssistantYjs;
  variable: OutputVariableYjs;
  depth?: number;
  onRemove?: () => void;
  projectId: string;
  gitRef: string;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(variable) as Map<any>).doc!;
  const runtimeVariable = getRuntimeOutputVariable(variable);

  const { dialog, showDialog } = useDialog();
  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();

  const variables = (variableYjs?.variables || []).filter((x) => x.type?.type === variable.type);
  const datastoreVariable = variables.find((x) => {
    const j = variable?.variable ?? { scope: '', key: '' };
    return `${x.scope}_${x.key}` === `${j.scope}_${j.key}`;
  });

  const v = datastoreVariable?.type ?? variable;

  return (
    <>
      <Box component={TableRow} key={variable.id}>
        <Box component={TableCell}>
          <Box sx={{ ml: depth }}>
            {runtimeVariable ? (
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  gap: 1,
                  border: 0,
                  borderRadius: 1,
                  whiteSpace: 'nowrap',
                }}>
                {runtimeVariable.icon}

                <Typography>{t(runtimeVariable.i18nKey)}</Typography>
              </Stack>
            ) : (
              <TextField
                variant="standard"
                disabled={Boolean(disabled) || parent?.type === 'array'}
                fullWidth
                hiddenLabel
                placeholder={t('outputVariableName')}
                value={v.name || ''}
                onChange={(e) => (v.name = e.target.value)}
              />
            )}
          </Box>
        </Box>
        <Box component={TableCell}>
          <TextField
            sx={{
              visibility: [RuntimeOutputVariable.text, RuntimeOutputVariable.images].includes(
                v.name as RuntimeOutputVariable
              )
                ? 'hidden'
                : undefined,
            }}
            variant="standard"
            disabled={Boolean(disabled)}
            fullWidth
            hiddenLabel
            placeholder={t(value.type === 'prompt' ? 'outputVariablePlaceholderForLLM' : 'outputVariablePlaceholder')}
            value={v.description || ''}
            onChange={(e) => (v.description = e.target.value)}
          />
        </Box>
        <Box component={TableCell}>
          {!runtimeVariable && (
            <VariableTypeField
              variant="standard"
              disabled={Boolean(disabled)}
              value={v.type || 'string'}
              onChange={(e) => {
                const type = e.target.value as any;

                if (variable.variable?.key) {
                  showDialog({
                    formSx: {
                      '.MuiDialogTitle-root': {
                        border: 0,
                      },
                      '.MuiDialogActions-root': {
                        border: 0,
                      },
                      '.save': {
                        background: '#d32f2f',
                      },
                    },
                    maxWidth: 'sm',
                    fullWidth: true,
                    title: <Box sx={{ wordWrap: 'break-word' }}>{t('outputVariableParameter.changeTypeTitle')}</Box>,
                    content: (
                      <Box>
                        <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                          {t('outputVariableParameter.change')}
                        </Typography>
                      </Box>
                    ),
                    okText: t('confirm'),
                    okColor: 'error',
                    cancelText: t('alert.cancel'),
                    onOk: () => {
                      delete variable.variable;

                      variable.type = type;
                      if (variable.type === 'array') {
                        variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
                      }
                    },
                  });
                } else {
                  variable.type = type;
                  if (variable.type === 'array') {
                    variable.element ??= { id: nanoid(), name: 'element', type: 'string' };
                  }
                }
              }}
            />
          )}
        </Box>
        <Box component={TableCell} align="right">
          <Stack direction="row" gap={1} justifyContent="flex-end">
            {v.type === 'object' && (
              <Button
                sx={{ minWidth: 24, minHeight: 24, p: 0 }}
                disabled={Boolean(variable.variable?.key)}
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
                <Icon icon="tabler:plus" />
              </Button>
            )}

            <PopperButton
              isSaveAs={Boolean(depth === 0 && !runtimeVariable)}
              runtimeVariable={Boolean(runtimeVariable)}
              variables={variables}
              variable={datastoreVariable}
              parameter={variable}
              onDelete={onRemove}
              disabled={Boolean(disabled)}
            />
          </Stack>
        </Box>
      </Box>

      {!runtimeVariable &&
        v.type === 'object' &&
        v.properties &&
        sortBy(Object.values(v.properties), 'index').map((property) => (
          <React.Fragment key={property.data.id}>
            <VariableRow
              parent={v}
              disabled={Boolean(variable.variable?.key || disabled)}
              value={value}
              variable={property.data}
              depth={depth + 1}
              projectId={projectId}
              gitRef={gitRef}
              onRemove={() => {
                doc.transact(() => {
                  if (!v.properties) return;
                  delete v.properties[property.data.id];
                  sortBy(Object.values(v.properties), 'index').forEach((item, index) => (item.index = index));
                });
              }}
            />
          </React.Fragment>
        ))}

      {!runtimeVariable && v.type === 'array' && v.element && (
        <VariableRow
          parent={v}
          disabled={Boolean(variable.variable?.key || disabled)}
          projectId={projectId}
          gitRef={gitRef}
          value={value}
          variable={v.element}
          depth={depth + 1}
        />
      )}

      {dialog}
    </>
  );
}

function PopperButton({
  variables,
  variable,
  isSaveAs,
  runtimeVariable,
  parameter,
  disabled,
  onDelete,
}: {
  variables: VariableYjs[];
  variable?: VariableYjs;
  isSaveAs: boolean;
  runtimeVariable: boolean;
  parameter: OutputVariableYjs;
  disabled: boolean;
  onDelete?: () => void;
}) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  const [currentSetting, setSetting] = useState<'setting' | 'save'>('setting');

  const isDefaultRequired = [RuntimeOutputVariable.images, RuntimeOutputVariable.text].includes(
    parameter.name as RuntimeOutputVariable
  );

  const renderParameterSettings = (parameter: OutputVariableYjs) => {
    if (currentSetting === 'setting') {
      return (
        <>
          {runtimeVariable ? null : parameter.type === 'string' ? (
            <Box>
              <Typography variant="subtitle2">{t('defaultValue')}</Typography>

              <TextField
                disabled={Boolean(disabled)}
                hiddenLabel
                fullWidth
                multiline
                placeholder={t('outputParameterDefaultValuePlaceholder')}
                value={parameter.defaultValue || ''}
                onChange={(e) => (parameter.defaultValue = e.target.value)}
              />
            </Box>
          ) : parameter.type === 'number' ? (
            <Box>
              <Typography variant="subtitle2">{t('defaultValue')}</Typography>

              <NumberField
                disabled={Boolean(disabled)}
                hiddenLabel
                fullWidth
                placeholder={t('outputParameterDefaultValuePlaceholder')}
                value={parameter.defaultValue || ''}
                onChange={(value) => (parameter.defaultValue = value)}
              />
            </Box>
          ) : null}

          <Box>
            <FormControl>
              <FormControlLabel
                sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                labelPlacement="start"
                label={t('outputParameterRequiredLabel')}
                disabled={isDefaultRequired}
                control={
                  <BaseSwitch
                    sx={{ mr: 1, mt: '1px' }}
                    checked={isDefaultRequired || parameter.required || false}
                    onChange={(_, required) => (parameter.required = required)}
                  />
                }
              />
            </FormControl>
          </Box>
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
                if (parameter.variable) delete parameter.variable;
              }}
              onChange={(_value) => {
                if (_value && parameter) {
                  parameter.variable = { key: _value.key, scope: _value.scope || '' };
                }
              }}
            />
          </Box>
        </Box>
      );
    }

    return null;
  };

  return (
    <>
      <PopperMenu
        ButtonProps={{
          sx: { minWidth: 0, p: 0.5, ml: -0.5 },
          ...bindTrigger(parameterSettingPopperState),
          disabled,
          children: <Box component={Icon} icon="tabler:dots" sx={{ color: '#3B82F6' }} />,
        }}>
        <MenuItem
          onClick={() => {
            setSetting('setting');
            dialogState.open();
          }}>
          {t('setting')}
        </MenuItem>

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
          <Stack gap={1.5}>{renderParameterSettings(parameter)}</Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={dialogState.close}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function VariableTypeField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField hiddenLabel placeholder={t('format')} select SelectProps={{ autoWidth: true }} {...props}>
      <MenuItem value="string">
        <ListItemIcon>
          <Icon icon="tabler:cursor-text" />
        </ListItemIcon>
        {t('text')}
      </MenuItem>

      <MenuItem value="number">
        <ListItemIcon>
          <Icon icon="tabler:square-number-1" />
        </ListItemIcon>
        {t('number')}
      </MenuItem>

      <MenuItem value="object">
        <ListItemIcon>
          <Icon icon="tabler:code-plus" />
        </ListItemIcon>
        {t('object')}
      </MenuItem>

      <MenuItem value="array">
        <ListItemIcon>
          <Icon icon="tabler:brackets-contain" />
        </ListItemIcon>
        {t('array')}
      </MenuItem>
    </TextField>
  );
}

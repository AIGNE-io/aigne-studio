import { useProjectStore } from '@app/pages/project/yjs-state';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import {
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  MenuItem,
  Paper,
  Popper,
  Stack,
  TextField,
  TextFieldProps,
  Typography,
} from '@mui/material';
import { cloneDeep, sortBy } from 'lodash';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { useId } from 'react';
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
    <Box sx={{ border: '1px solid #E5E7EB', px: 1, py: 2, borderRadius: 1 }}>
      <Stack direction="row" alignItems="center" sx={{ cursor: 'pointer', px: 1 }} gap={1}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 500,
          }}>
          {t('output')}
        </Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end" />
      </Stack>

      <Box component="table" sx={{ minWidth: '100%', th: { whiteSpace: 'nowrap' } }}>
        <thead>
          <tr>
            <Box component="th">{t('name')}</Box>
            <Box component="th">{t('description')}</Box>
            <Box component="th">{t('type')}</Box>
            <Box component="th">{t('required')}</Box>
            <Box component="th">{t('defaultValue')}</Box>
            <Box component="th">{t('actions')}</Box>
          </tr>
        </thead>
        <tbody>
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
        </tbody>
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
                vars[id] = { index: Object.values(vars).length, data: { id, name } };
              }

              sortBy(Object.values(vars), 'index').forEach((item, index) => (item.index = index));
            });
          }}
        />
      )}
    </Box>
  );
}

function VariableRow({
  value,
  variable,
  depth = 0,
  onRemove,
  projectId,
  gitRef,
  disabled,
}: {
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
  const outputPopperState = usePopupState({ variant: 'popper', popupId: useId() });
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
      <tr key={variable.id}>
        <Box component="td">
          <Box sx={{ ml: depth }}>
            {runtimeVariable ? (
              <Stack
                direction="row"
                alignItems="center"
                sx={{
                  px: 1,
                  py: 0.5,
                  gap: 1,
                  border: 1,
                  borderRadius: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.100',
                  whiteSpace: 'nowrap',
                }}>
                {runtimeVariable.icon}

                <Typography>{t(runtimeVariable.i18nKey)}</Typography>
              </Stack>
            ) : (
              <TextField
                disabled={Boolean(disabled)}
                fullWidth
                hiddenLabel
                placeholder={t('name')}
                value={v.name || ''}
                onChange={(e) => (v.name = e.target.value)}
              />
            )}
          </Box>
        </Box>
        <Box component="td">
          <TextField
            disabled={Boolean(disabled)}
            fullWidth
            hiddenLabel
            placeholder={t('placeholder')}
            value={v.description || ''}
            onChange={(e) => (v.description = e.target.value)}
          />
        </Box>
        <Box component="td" align="center">
          {!runtimeVariable && (
            <VariableTypeField
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
        <Box component="td" align="center">
          <Checkbox
            disabled={Boolean(disabled)}
            checked={v.required || false}
            onChange={(_, checked) => {
              v.required = checked;
            }}
          />
        </Box>
        <Box component="td" align="center">
          {runtimeVariable ? null : v.type === 'string' ? (
            <TextField
              disabled={Boolean(disabled)}
              hiddenLabel
              fullWidth
              multiline
              value={v.defaultValue || ''}
              onChange={(e) => (v.defaultValue = e.target.value)}
            />
          ) : v.type === 'number' ? (
            <NumberField
              disabled={Boolean(disabled)}
              hiddenLabel
              fullWidth
              value={v.defaultValue || ''}
              onChange={(value) => (v.defaultValue = value)}
            />
          ) : null}
        </Box>
        <td align="right">
          <Stack direction="row" gap={1} justifyContent="flex-end">
            {depth === 0 && !runtimeVariable && (
              <>
                <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} {...bindTrigger(outputPopperState)}>
                  <Icon icon="tabler:settings" />
                </Button>

                <Popper
                  {...bindPopper(outputPopperState)}
                  placement="bottom-end"
                  sx={{ zIndex: (theme) => theme.zIndex.modal }}>
                  <ClickAwayListener
                    onClickAway={(e) => {
                      if (e.target === document.body) return;
                      outputPopperState.close();
                    }}>
                    <Paper sx={{ p: 3, width: 320, maxHeight: '80vh', overflow: 'auto' }}>
                      <Stack gap={2}>
                        <Box>
                          <Box>
                            <Typography variant="subtitle2" mb={0}>
                              {t('memory.saveMemory')}
                            </Typography>

                            <Box>
                              <SelectVariable
                                projectId={projectId}
                                gitRef={gitRef}
                                variables={variables}
                                variable={datastoreVariable}
                                typeDefaultSetting={{
                                  name: variable.name || '',
                                  defaultValue: (variable as any).defaultValue || '',
                                  type: {
                                    id: nanoid(32),
                                    type: variable.type || 'string',
                                    properties:
                                      variable.type === 'object'
                                        ? variable.properties && cloneDeep(variable.properties)
                                        : undefined,
                                    element:
                                      variable.type === 'array'
                                        ? variable.element && cloneDeep(variable.element)
                                        : undefined,
                                  },
                                  disabled: true,
                                }}
                                onDelete={() => {
                                  if (variable.variable) {
                                    delete variable.variable;
                                  }
                                }}
                                onChange={(_value) => {
                                  if (_value && variable) {
                                    variable.variable = { key: _value.key, scope: _value.scope || '' };

                                    if (_value.type?.type === 'object') {
                                      (variable as any).properties =
                                        _value.type.properties && cloneDeep(_value.type.properties);
                                    }

                                    if (_value.type?.type === 'array') {
                                      (variable as any).element = _value.type.element && cloneDeep(_value.type.element);
                                    }
                                  }
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  </ClickAwayListener>
                </Popper>
              </>
            )}

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

            {onRemove && (
              <Button sx={{ minWidth: 24, minHeight: 24, p: 0 }} disabled={disabled} onClick={onRemove}>
                <Icon icon="tabler:minus" />
              </Button>
            )}
          </Stack>
        </td>
      </tr>

      {!runtimeVariable &&
        v.type === 'object' &&
        v.properties &&
        sortBy(Object.values(v.properties), 'index').map((property) => (
          <React.Fragment key={property.data.id}>
            <VariableRow
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

function VariableTypeField({ ...props }: TextFieldProps) {
  const { t } = useLocaleContext();

  return (
    <TextField hiddenLabel placeholder={t('type')} select SelectProps={{ autoWidth: true }} {...props}>
      <MenuItem value="string">{t('text')}</MenuItem>
      <MenuItem value="number">{t('number')}</MenuItem>
      <MenuItem value="object">{t('object')}</MenuItem>
      <MenuItem value="array">{t('array')}</MenuItem>
    </TextField>
  );
}

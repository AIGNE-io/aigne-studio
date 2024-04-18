import DragVertical from '@app/pages/project/icons/drag-vertical';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, StringParameter } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { InfoOutlined } from '@mui/icons-material';
import {
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  Input,
  List,
  ListItem,
  ListSubheader,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { get, sortBy } from 'lodash';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo, useState } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';
import ParameterConfig from '../template-form/parameter-config';
import ParameterConfigType from '../template-form/parameter-config/type';
import useVariablesEditorOptions from './use-variables-editor-options';

function CustomNoRowsOverlay() {
  const { t } = useLocaleContext();

  return (
    <Stack width={1} textAlign="center">
      <Box lineHeight="28px">🔢</Box>

      <Typography variant="caption" color="#030712" fontSize={13} lineHeight="22px" fontWeight={500}>
        {t('emptyVariablesTitle')}
      </Typography>

      <Typography variant="caption" color="#9CA3AF" fontSize={12} lineHeight="20px" fontWeight={500}>
        {t('emptyVariablesSubtitle')}
      </Typography>
    </Stack>
  );
}

export default function ParametersTable({
  readOnly,
  value,
  projectId,
  gitRef,
  compareValue,
  isRemoteCompare,
}: {
  readOnly?: boolean;
  value: AssistantYjs;
  projectId: string;
  gitRef: string;
  compareValue?: AssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(value) as Map<any>)?.doc!;
  const { highlightedId, addParameter, deleteParameter } = useVariablesEditorOptions(value);
  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const isValidVariableName = (name: string) => {
    if (!name) return true;

    const validNameRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return validNameRegex.test(name);
  };

  const [paramConfig, setParamConfig] = useState<{ anchorEl: HTMLElement; parameter: ParameterYjs }>();
  const parameters = sortBy(Object.values(value.parameters ?? {}), (i) => i.index);

  const columns = useMemo<GridColDef<(typeof parameters)[number]>[]>(() => {
    return [
      {
        field: 'key',
        width: '16%' as any,
        headerName: t('variable'),
        renderCell: ({ row: { data: parameter } }) => {
          return (
            <WithAwareness
              projectId={projectId}
              gitRef={gitRef}
              sx={{ top: 4, right: -8 }}
              path={[value.id, 'parameters', parameter?.id ?? '', 'key']}>
              <Input
                id={`${parameter.id}-key`}
                fullWidth
                readOnly={readOnly}
                placeholder={t('variable')}
                value={parameter.key || ''}
                onChange={(e) => {
                  const value = e.target.value.trim();

                  if (isValidVariableName(value)) {
                    parameter.key = value;
                  }
                }}
              />
            </WithAwareness>
          );
        },
      },
      {
        field: 'label',
        width: '16%',
        headerName: t('label'),
        renderCell: ({ row: { data: parameter } }) => (
          <WithAwareness
            projectId={projectId}
            gitRef={gitRef}
            sx={{ top: 4, right: -8 }}
            path={[value.id, 'parameters', parameter?.id ?? '', 'label']}>
            <Input
              fullWidth
              readOnly={readOnly}
              placeholder={parameter.key || t('label')}
              value={parameter.label || ''}
              onChange={(e) => (parameter.label = e.target.value)}
            />
          </WithAwareness>
        ),
      },
      {
        field: 'placeholder',
        renderHeader() {
          return (
            <>
              {t('form.parameter.placeholder')}
              <Tooltip title={t('parametersTip', { variable: '{variable}' })} placement="top-start" disableInteractive>
                <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
              </Tooltip>
            </>
          );
        },
        renderCell: ({ row: { data: parameter } }) => (
          <WithAwareness
            projectId={projectId}
            gitRef={gitRef}
            sx={{ top: 4, right: -8 }}
            path={[value.id, 'parameters', parameter?.id ?? '', 'placeholder']}>
            <Input
              fullWidth
              readOnly={readOnly}
              placeholder={t('form.parameter.placeholder')}
              value={parameter.placeholder || ''}
              onChange={(e) => (parameter.placeholder = e.target.value)}
            />
          </WithAwareness>
        ),
      },
      {
        field: 'type',
        headerName: t('type'),
        width: 100,
        renderCell: ({ row: { data: parameter } }) => {
          const multiline = (!parameter.type || parameter.type === 'string') && parameter?.multiline;
          return (
            <WithAwareness
              projectId={projectId}
              gitRef={gitRef}
              sx={{ top: 4, right: -8 }}
              path={[value.id, 'parameters', parameter?.id ?? '', 'type']}>
              <ParameterConfigType
                variant="standard"
                hiddenLabel
                SelectProps={{ autoWidth: true }}
                value={multiline ? 'multiline' : parameter?.type ?? 'string'}
                InputProps={{ readOnly }}
                onChange={(e) => {
                  const newValue = e.target.value;
                  doc.transact(() => {
                    if (newValue === 'multiline') {
                      parameter.type = 'string';
                      (parameter as StringParameter)!.multiline = true;
                    } else {
                      parameter.type = newValue as any;
                      if (typeof (parameter as StringParameter).multiline !== 'undefined') {
                        delete (parameter as StringParameter)!.multiline;
                      }
                    }
                  });
                }}
              />
            </WithAwareness>
          );
        },
      },
      {
        field: 'actions',
        headerName: t('actions'),
        width: 70,
        headerAlign: 'center',
        align: 'right',
      },
    ];
  }, [t, readOnly, doc, deleteParameter]);

  const settingPopperState = usePopupState({ variant: 'popper' });

  const removeParameter = (key: string) => {
    doc.transact(() => {
      if (!value.parameters) return;
      for (const id of Object.keys(value.parameters)) {
        if (value.parameters[id]?.data.key === key) delete value.parameters[id];
      }
    });
  };

  return (
    <>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle2">{t('parameters')}</Typography>

          {!readOnly && (
            <Stack direction="row">
              <Button sx={{ minWidth: 32, p: 0, minHeight: 32 }} {...bindTrigger(settingPopperState)}>
                <Box fontSize={16} component={Icon} icon="tabler:settings-2" />
              </Button>

              <Popper {...bindPopper(settingPopperState)} placement="bottom-end">
                <ClickAwayListener onClickAway={settingPopperState.close}>
                  <Paper>
                    <List dense>
                      <ListSubheader>{t('mode')}</ListSubheader>
                      <ListItem>
                        <RadioGroup
                          value={parameters.some((i) => i.data.key === 'question') ? 'chat' : 'form'}
                          onChange={(_, v) => {
                            if (v === 'chat') {
                              addParameter('question');
                            } else {
                              removeParameter('question');
                            }
                          }}>
                          <FormControlLabel value="form" control={<Radio />} label={t('form.form')} />
                          <FormControlLabel value="chat" control={<Radio />} label={t('form.chat')} />
                        </RadioGroup>
                      </ListItem>
                      <ListSubheader>{t('dataset')}</ListSubheader>
                      <ListItem>
                        <FormControlLabel
                          control={<Checkbox />}
                          label={t('withCollectionManage')}
                          checked={parameters.some((i) => i.data.key === 'datasetId')}
                          onChange={(_, checked) => {
                            if (checked) {
                              addParameter('datasetId');
                            } else {
                              removeParameter('datasetId');
                            }
                          }}
                        />
                      </ListItem>
                    </List>
                  </Paper>
                </ClickAwayListener>
              </Popper>

              <Button
                sx={{ minWidth: 32, p: 0, minHeight: 32 }}
                onClick={() => {
                  const id = addParameter('');
                  setTimeout(() => {
                    document.getElementById(`${id}-key`)?.focus();
                  });
                }}>
                <Box fontSize={16} component={Icon} icon="tabler:plus" />
              </Button>
            </Stack>
          )}
        </Stack>

        {parameters.length ? (
          <Box
            sx={{
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              table: {
                td: { py: 0 },
                'tbody tr:last-of-type td': {
                  border: 'none',
                },
              },
            }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.field}
                      align={column.headerAlign}
                      width={column.width}
                      sx={{ px: 0, py: 1, fontWeight: 500, fontSize: 13, lineHeight: '22px' }}>
                      {column.field === 'placeholder' ? (
                        <Box display="flex" alignItems="center">
                          {t('form.parameter.placeholder')}
                          <Tooltip title={t('form.parameter.placeholderTip')} disableInteractive>
                            <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14, marginLeft: 0.5 }} />
                          </Tooltip>
                        </Box>
                      ) : (
                        column.headerName
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <DragSortListYjs
                disabled={readOnly}
                list={value.parameters!}
                component={TableBody}
                renderItem={(parameter, _, params) => {
                  return (
                    <TableRow
                      key={parameter.id}
                      ref={(ref) => {
                        params.drop(ref);
                        params.preview(ref);
                      }}
                      sx={{
                        backgroundColor:
                          parameter.id === highlightedId
                            ? (theme) => alpha(theme.palette.warning.light, theme.palette.action.focusOpacity)
                            : 'transparent',
                        transition: 'all 2s',
                        '.hover-visible': {
                          display: 'none',
                        },
                        ':hover': {
                          '.hover-visible': {
                            display: 'flex',
                          },
                        },
                      }}>
                      {columns.map((column, index) => {
                        return (
                          index !== columns.length - 1 && (
                            <TableCell
                              key={column.field}
                              align={column.align}
                              sx={{
                                position: 'relative',
                                px: 0,
                                ...getDiffBackground('parameters', parameter.id),
                              }}>
                              {index === 0 && (
                                <Stack
                                  className="hover-visible"
                                  ref={params.drag}
                                  alignItems="center"
                                  sx={{ p: 0.5, cursor: 'move', position: 'absolute', left: -24, top: 0, bottom: 0 }}>
                                  <DragVertical sx={{ color: '#9CA3AF', fontSize: 22 }} />
                                </Stack>
                              )}

                              {column.renderCell?.({ row: { data: parameter } } as any) || get(parameter, column.field)}
                            </TableCell>
                          )
                        );
                      })}

                      <TableCell sx={{ px: 0, ...getDiffBackground('parameters', parameter.id) }} align="right">
                        {!readOnly && (
                          <>
                            <Button
                              sx={{ minWidth: 0, p: 0.5, ml: -0.5, cursor: 'pointer' }}
                              onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, parameter })}>
                              <Box sx={{ color: '#3B82F6', fontSize: 13 }}>{t('setting')}</Box>
                            </Button>

                            <Button
                              sx={{ minWidth: 0, p: 0.5, cursor: 'pointer' }}
                              onClick={() => deleteParameter(parameter)}>
                              <Box sx={{ color: '#E11D48', fontSize: 13 }}>{t('delete')}</Box>
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }}
              />
            </Table>
          </Box>
        ) : (
          <CustomNoRowsOverlay />
        )}
      </Box>

      <Popper
        open={Boolean(paramConfig)}
        anchorEl={paramConfig?.anchorEl}
        placement="bottom-end"
        sx={{ zIndex: (theme) => theme.zIndex.modal }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setParamConfig(undefined);
          }}>
          <Paper sx={{ p: 3, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            {paramConfig && <ParameterConfig readOnly={readOnly} value={paramConfig.parameter} />}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

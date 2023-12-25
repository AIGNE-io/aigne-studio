import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, StringParameter } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import {
  Box,
  Button,
  ClickAwayListener,
  Input,
  Paper,
  Popper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { get, sortBy } from 'lodash';
import { useMemo, useState } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import Add from '../../pages/project/icons/add';
import Settings from '../../pages/project/icons/settings';
import Trash from '../../pages/project/icons/trash';
import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';
import ParameterConfig from '../template-form/parameter-config';
import ParameterConfigType from '../template-form/parameter-config/type';
import useVariablesEditorOptions from './use-variables-editor-options';

function CustomNoRowsOverlay() {
  const { t } = useLocaleContext();

  return (
    <Box width={1} height={1} display="flex" justifyContent="center" alignItems="center">
      <Typography variant="caption" color="text.disabled">
        {t('noVariables')}
      </Typography>
    </Box>
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
        flex: 1,
        field: 'key',
        headerName: t('variable'),
        renderCell: ({ row: { data: parameter } }) => (
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
        ),
      },
      {
        flex: 1,
        field: 'label',
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
              placeholder={parameter.key}
              value={parameter.label || ''}
              onChange={(e) => (parameter.label = e.target.value)}
            />
          </WithAwareness>
        ),
      },
      {
        field: 'type',
        headerName: t('type'),
        headerAlign: 'center',
        align: 'center',
        width: 140,
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
                sx={{ ml: 2 }}
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
        headerAlign: 'center',
        align: 'center',
        width: 100,
        renderCell: ({ row: { data: parameter } }) => {
          return (
            <>
              <Button
                disabled={readOnly}
                sx={{ minWidth: 0, p: 0.5, borderRadius: 100 }}
                onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, parameter })}>
                <Settings fontSize="small" sx={{ color: 'text.secondary' }} />
              </Button>

              <Button
                disabled={readOnly}
                sx={{ minWidth: 0, p: 0.5, borderRadius: 100 }}
                onClick={() => deleteParameter(parameter)}>
                <Trash fontSize="small" sx={{ color: 'text.secondary', opacity: 0.9 }} />
              </Button>
            </>
          );
        },
      },
    ];
  }, [t, readOnly, doc, deleteParameter]);

  return (
    <>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1">{t('parameters')}</Typography>

          {!readOnly && (
            <Button
              sx={{ minWidth: 32, p: 0, minHeight: 32 }}
              onClick={() => {
                const id = addParameter('');
                setTimeout(() => {
                  document.getElementById(`${id}-key`)?.focus();
                });
              }}>
              <Add />
            </Button>
          )}
        </Stack>

        {parameters.length ? (
          <Box
            sx={{
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              overflow: 'auto',
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
                    <TableCell key={column.field} align={column.headerAlign} width={column.width}>
                      {column.headerName}
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
                        params.drag(ref);
                        params.preview(ref);
                      }}
                      sx={{
                        backgroundColor:
                          parameter.id === highlightedId
                            ? (theme) => alpha(theme.palette.warning.light, theme.palette.action.focusOpacity)
                            : 'transparent',
                        transition: 'all 2s',
                      }}>
                      {columns.map((column) => (
                        <TableCell
                          key={column.field}
                          align={column.align}
                          sx={{
                            ...getDiffBackground('parameters', parameter.id),
                          }}>
                          {column.renderCell?.({ row: { data: parameter } } as any) || get(parameter, column.field)}
                        </TableCell>
                      ))}
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

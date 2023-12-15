import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, StringParameter, nextAssistantId } from '@blocklet/ai-runtime/types';
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
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { get, sortBy } from 'lodash';
import { useCallback, useMemo, useState } from 'react';

import Add from '../../pages/project/icons/add';
import Settings from '../../pages/project/icons/settings';
import Trash from '../../pages/project/icons/trash';
import ParameterConfig from '../template-form/parameter-config';
import ParameterConfigType from '../template-form/parameter-config/type';

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
}: {
  readOnly?: boolean;
  value: Pick<AssistantYjs, 'id' | 'parameters'>;
}) {
  const doc = (getYjsValue(value) as Map<any>)?.doc!;

  const { t } = useLocaleContext();

  const createParameter = useCallback(() => {
    const id = nextAssistantId();

    const doc = (getYjsValue(value) as Map<any>).doc!;

    doc.transact(() => {
      value.parameters ??= {};
      value.parameters[id] ??= {
        index: Math.max(-1, ...Object.values(value.parameters).map((i) => i.index)) + 1,
        data: { id },
      };
    });

    setTimeout(() => {
      document.getElementById(`${id}-key`)?.focus();
    });
  }, [value]);

  const deleteParameter = useCallback(
    (parameter: ParameterYjs) => {
      const doc = (getYjsValue(value) as Map<any>).doc!;
      doc.transact(() => {
        if (!value.parameters) return;
        delete value.parameters[parameter.id];
        Object.values(value.parameters).forEach((item, index) => (item.index = index));
      });
    },
    [value]
  );

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
        ),
      },
      {
        flex: 1,
        field: 'label',
        headerName: t('label'),
        renderCell: ({ row: { data: parameter } }) => (
          <Input
            fullWidth
            readOnly={readOnly}
            placeholder={parameter.key}
            value={parameter.label || ''}
            onChange={(e) => (parameter.label = e.target.value)}
          />
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
                sx={{ minWidth: 0, p: 0.5, borderRadius: 100 }}
                onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, parameter })}>
                <Settings fontSize="small" sx={{ color: 'text.secondary' }} />
              </Button>

              <Button sx={{ minWidth: 0, p: 0.5, borderRadius: 100 }} onClick={() => deleteParameter(parameter)}>
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

          <Button sx={{ minWidth: 32, p: 0, minHeight: 32 }} onClick={createParameter}>
            <Add />
          </Button>
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
              <TableBody>
                {parameters.map(
                  ({ data: parameter }) =>
                    parameter && (
                      <TableRow key={parameter.id}>
                        {columns.map((column) => (
                          <TableCell key={column.field} align={column.align}>
                            {column.renderCell?.({ row: { data: parameter } } as any) || get(parameter, column.field)}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                )}
              </TableBody>
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

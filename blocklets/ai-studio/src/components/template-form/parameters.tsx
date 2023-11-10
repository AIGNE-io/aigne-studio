import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Button, ClickAwayListener, Input, MenuItem, Paper, Popper, Select, Typography } from '@mui/material';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { useDeferredValue, useMemo, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import Settings from '../../pages/project/icons/settings';
import { useTemplateCompare } from '../../pages/project/state';
import ParameterConfig from './parameter-config';

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

export default function Parameters({
  readOnly,
  form,
  compareValue,
}: {
  readOnly?: boolean;
  form: Pick<TemplateYjs, 'id' | 'type' | 'name' | 'prompts' | 'parameters'>;
  compareValue?: TemplateYjs;
}) {
  // TODO: parameters 支持自定义顺序，到时候可以去掉这个实时 match params 的逻辑，直接渲染 template.parameters 数据即可
  const deferredValue = useDeferredValue(form);
  const { t } = useLocaleContext();
  const dataGrid = useGridApiRef();

  const params = (() => {
    const params = Object.values(deferredValue.prompts ?? {})?.flatMap((i) => matchParams(i.data.content ?? '')) ?? [];
    if (deferredValue.type === 'branch') {
      params.push('question');
    }
    if (deferredValue.type === 'image') {
      params.push('size');
      params.push('number');
    }
    return [...new Set(params)];
  })()
    .filter((i) => form.parameters?.[i])
    .map((param) => ({ param }));

  const [paramConfig, setParamConfig] = useState<{ anchorEl: HTMLElement; param: string }>();

  const columns = useMemo<GridColDef<{ param: string }>[]>(() => {
    return [
      {
        field: 'key',
        headerName: t('variable'),
        headerAlign: 'center',
        sortable: false,
        align: 'center',
        renderCell: ({ row }) => {
          return <Box>{row.param}</Box>;
        },
      },
      {
        flex: 1,
        field: 'label',
        headerName: t('label'),
        sortable: false,
        renderCell: ({ row }) => {
          const parameter = form.parameters?.[row.param];
          if (!parameter) return null;

          return (
            <Input
              readOnly={readOnly}
              fullWidth
              value={parameter.label || ''}
              onChange={(e) => (parameter.label = e.target.value)}
            />
          );
        },
      },
      {
        field: 'type',
        headerName: t('type'),
        headerAlign: 'center',
        sortable: false,
        align: 'center',
        width: 120,
        renderCell: ({ row }) => {
          const parameter = form.parameters?.[row.param];
          if (!parameter) return null;

          return (
            <Select
              sx={{ ml: 2 }}
              variant="standard"
              fullWidth
              size="small"
              readOnly={readOnly}
              value={parameter.type ?? 'string'}
              onChange={(e) => (parameter.type = e.target.value as any)}>
              <MenuItem value="string">{t('form.parameter.typeText')}</MenuItem>
              <MenuItem value="number">{t('form.parameter.typeNumber')}</MenuItem>
              <MenuItem value="select">{t('form.parameter.typeSelect')}</MenuItem>
              <MenuItem value="language">{t('form.parameter.typeLanguage')}</MenuItem>
              <MenuItem value="horoscope">{t('form.parameter.typeHoroscope')}</MenuItem>
            </Select>
          );
        },
      },
      {
        field: 'actions',
        headerName: t('actions'),
        headerClassName: 'th',
        headerAlign: 'center',
        sortable: false,
        align: 'center',
        renderCell: ({ row }) => (
          <Button
            sx={{ minWidth: 0, p: 0.5, borderRadius: 100 }}
            onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, param: row.param })}>
            <Settings fontSize="small" sx={{ color: 'text.secondary' }} />
          </Button>
        ),
      },
    ];
  }, [dataGrid, t, form.id, readOnly]);

  const { getDiffName, getBackgroundColor } = useTemplateCompare({
    value: form as TemplateYjs,
    compareValue,
    disabled: readOnly,
  });

  return (
    <>
      <Box
        sx={{
          '& .MuiDataGrid-root .MuiDataGrid-columnSeparator': {
            display: 'none',
          },
          '& .th': {
            color: 'text.secondary',
          },
          '& .MuiDataGrid-root .MuiDataGrid-cell': {
            outline: 'none',
            '&:focus-visible': {
              outline: 'none',
            },
            '&:focus-within': {
              outline: 'none',
            },

            '.MuiDataGrid-columnHeader': {
              outline: 'none',
              '&:focus-visible': {
                outline: 'none',
              },
              '&:focus-within': {
                outline: 'none',
              },
            },
          },
          '& .MuiDataGrid-root .MuiDataGrid-columnHeader': {
            outline: 'none',
            '&:focus-visible': {
              outline: 'none',
            },
            '&:focus-within': {
              outline: 'none',
            },

            '.MuiDataGrid-columnHeader': {
              outline: 'none',
              '&:focus-visible': {
                outline: 'none',
              },
              '&:focus-within': {
                outline: 'none',
              },
            },
          },

          '& .custom-parameter-new': {
            background: getBackgroundColor('new'),
          },
          '& .custom-parameter-modify': {
            background: getBackgroundColor('modify'),
          },
          '& .custom-parameter-delete': {
            background: getBackgroundColor('delete'),
          },
        }}>
        <DataGrid
          getRowClassName={(params) => {
            return `custom-parameter-${getDiffName('parameters', params.row.param)}`;
          }}
          key={form.id}
          apiRef={dataGrid}
          getRowId={(v) => v.param}
          rows={params}
          columns={columns}
          disableColumnMenu
          autoHeight
          hideFooter
          pageSizeOptions={[20]}
          density="compact"
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          slots={{
            noRowsOverlay: CustomNoRowsOverlay,
          }}
        />
      </Box>

      <Popper
        open={Boolean(paramConfig)}
        anchorEl={paramConfig?.anchorEl}
        placement="bottom-end"
        sx={{ zIndex: 12001 }}>
        <ClickAwayListener
          onClickAway={(e) => {
            if (e.target === document.body) return;
            setParamConfig(undefined);
          }}>
          <Paper sx={{ p: 3, maxWidth: 320, maxHeight: '80vh', overflow: 'auto' }}>
            {paramConfig && <ParameterConfig readOnly={readOnly} value={form.parameters![paramConfig.param]!} />}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}

export const matchParams = (template: string) => [
  ...new Set(Array.from(template.matchAll(/{{\s*(\w+)\s*}}/g)).map((i) => i[1]!)),
];

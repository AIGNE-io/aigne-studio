import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Button, ClickAwayListener, Input, MenuItem, Paper, Popper, Select, Typography } from '@mui/material';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { useDeferredValue, useMemo, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import type { ParameterYjs } from '../../../api/src/store/templates';
import Settings from '../../pages/project/icons/settings';
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
}: {
  readOnly?: boolean;
  form: Pick<TemplateYjs, 'type' | 'name' | 'prompts' | 'parameters'>;
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
  })();

  const [paramConfig, setParamConfig] = useState<{ anchorEl: HTMLElement; param: string }>();

  const rows = params
    .map((param) => {
      const parameter = form.parameters?.[param];
      if (!parameter) {
        return null;
      }

      return { key: param, ...parameter };
    })
    .filter(Boolean) as (ParameterYjs & { key: string })[];

  const columns = useMemo<GridColDef<ParameterYjs & { key: string }>[]>(() => {
    return [
      {
        field: 'key',
        headerName: t('variable'),
        headerClassName: 'th',
        headerAlign: 'center',
        sortable: false,
        align: 'center',
        renderCell: ({ row }) => {
          return <Box>{row.key}</Box>;
        },
      },
      {
        flex: 1,
        field: 'label',
        headerName: t('label'),
        headerClassName: 'th',
        sortable: false,
        renderCell: ({ row }) => {
          return (
            <Input
              defaultValue={row.label || ''}
              value={row.label || ''}
              onChange={(e) => {
                const param = form.parameters?.[row.key];
                if (param) {
                  param.label = e.target.value as any;
                }
              }}
            />
          );
        },
      },
      {
        field: 'type',
        headerName: t('type'),
        headerClassName: 'th',
        headerAlign: 'center',
        sortable: false,
        align: 'center',
        renderCell: ({ row }) => {
          return (
            <Select
              sx={{
                ml: 2,
                background: 'transparent',

                '&.Mui-focused ': {
                  background: 'transparent',
                },
                '&:hover ': {
                  background: 'transparent',
                },
                '.MuiSelect-select:focus': {
                  background: 'transparent',
                },
              }}
              fullWidth
              size="small"
              value={row.type ?? 'string'}
              onChange={(e) => {
                const param = form.parameters?.[row.key];
                if (param) {
                  param.type = e.target.value as any;
                }
              }}>
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
            onClick={(e) => setParamConfig({ anchorEl: e.currentTarget.parentElement!, param: row.key })}>
            <Settings fontSize="small" sx={{ color: 'text.secondary' }} />
          </Button>
        ),
      },
    ];
  }, [dataGrid, t]);

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
        }}>
        <DataGrid
          apiRef={dataGrid}
          getRowId={(v) => v.key}
          rows={rows}
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

      <Popper open={Boolean(paramConfig)} anchorEl={paramConfig?.anchorEl} placement="bottom-end" sx={{ zIndex: 1200 }}>
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

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Dialog, DialogContent, DialogProps, DialogTitle, IconButton, Tooltip } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { useAsync } from 'react-use';

import { getVariable, getVariables } from '../../libs/datastore';
import Close from '../project/icons/close';
import SegmentedControl from '../project/segmented-control';
import { useProjectStore } from '../project/yjs-state';

interface DialogImperative {
  form: UseFormReturn<{ key: string }>;
}

function VariableList() {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const { projectId } = useParams();
  const dialogState = usePopupState({ variant: 'dialog' });
  const { t } = useLocaleContext();
  const [scope, setScope] = useState('global');
  const [key, setKey] = useState('');

  const {
    loading,
    value: list,
    error,
  } = useAsync(
    () =>
      getVariables({
        projectId: projectId || '',
        offset: paginationModel.page * paginationModel.pageSize,
        limit: paginationModel.pageSize,
        scope,
      }),
    [paginationModel.page, paginationModel.pageSize, projectId, scope]
  );

  if (error) throw error;

  const columns = useMemo(
    () => [
      {
        field: 'title',
        headerName: t('variables.name'),
        flex: 1,
        renderCell: (params: any) => params.row?.key || t('unnamed'),
      },
      {
        field: 'count',
        headerName: t('variables.count'),
        flex: 1,
        renderCell: (params) => params.row?.count ?? 0,
      },
    ],
    [t]
  );

  return (
    <Box p={2.5}>
      <Box mb={2.5} className="center">
        <SegmentedControl
          value={scope}
          options={[
            { value: 'global', label: t('variableParameter.global') },
            { value: 'session', label: t('variableParameter.session') },
            { value: 'local', label: t('variableParameter.assistant') },
          ]}
          onChange={(value) => {
            if (value) setScope(value);
          }}
        />
      </Box>

      <DataGrid
        loading={loading}
        rows={list?.list ?? []}
        columns={columns}
        autoHeight
        disableColumnMenu
        rowSelectionModel={undefined}
        getRowId={(row) => row?.key || 'type'}
        keepNonExistentRowsSelected
        rowCount={list?.count || 0}
        pageSizeOptions={[10]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        onRowClick={(p) => {
          setKey(p.row.key);
          dialogState.open();
        }}
      />

      {dialogState.isOpen && (
        <VariableDialog
          scope={scope}
          variableKey={key}
          DialogProps={{ ...bindDialog(dialogState) }}
          onClose={dialogState.close}
          onSubmit={dialogState.close}
        />
      )}
    </Box>
  );
}

const VariableDialog = forwardRef<
  DialogImperative,
  { scope: string; variableKey: string; onSubmit: () => any; onClose: () => void; DialogProps?: DialogProps }
>(({ scope, variableKey, onSubmit, onClose, DialogProps }, ref) => {
  const { t } = useLocaleContext();
  const form = useForm<{ key: string }>({ defaultValues: {} });
  useImperativeHandle(ref, () => ({ form }), [form]);

  const { projectId } = useParams();
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const { getFileById } = useProjectStore(projectId || '', 'main');

  const {
    loading,
    value: result,
    error,
  } = useAsync(
    () =>
      getVariable({
        projectId: projectId || '',
        key: variableKey,
        scope,
        offset: paginationModel.page * paginationModel.pageSize,
        limit: paginationModel.pageSize,
      }),
    [variableKey, projectId, scope, paginationModel.page, paginationModel.pageSize]
  );

  if (error) throw error;

  const columns = useMemo(
    () => [
      {
        field: 'value',
        headerName: t('variables.value'),
        flex: 1,
        renderCell: (params: any) => {
          return (
            <Tooltip title={JSON.stringify(params.row?.data)}>
              <Box className="ellipsis">{JSON.stringify(params.row?.data)}</Box>
            </Tooltip>
          );
        },
      },
      {
        field: 'itemId',
        headerName: t('variables.itemId'),
        flex: 1,
        renderCell: (params) => params.row?.itemId,
      },
      {
        field: 'userId',
        headerName: t('userId'),
        flex: 1,
        renderCell: (params) => (
          <Tooltip title={JSON.stringify(params.row?.userId)}>
            <Box className="ellipsis">{params.row?.userId}</Box>
          </Tooltip>
        ),
      },
      {
        field: 'sessionId',
        headerName: t('sessionId'),
        flex: 1,
        renderCell: (params) => (
          <Tooltip title={JSON.stringify(params.row?.sessionId)}>
            <Box className="ellipsis">{params.row?.sessionId}</Box>
          </Tooltip>
        ),
      },
      {
        field: 'assistantId',
        headerName: t('assistantId'),
        flex: 1,
        renderCell: (params) => {
          const file = getFileById(params.row?.assistantId);
          return <Box>{file?.name}</Box>;
        },
      },
    ],
    [t]
  );

  return (
    <Dialog
      open={false}
      fullWidth
      maxWidth="lg"
      {...DialogProps}
      component="form"
      onSubmit={form.handleSubmit(onSubmit)}>
      <DialogTitle className="between">
        {`${variableKey} ${t('variables.dialogTitle')}`}

        <IconButton size="small" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <DataGrid
          loading={loading}
          rows={result?.list ?? []}
          columns={columns}
          autoHeight
          disableColumnMenu
          rowSelectionModel={undefined}
          keepNonExistentRowsSelected
          pageSizeOptions={[10]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
        />
      </DialogContent>
    </Dialog>
  );
});

export default VariableList;

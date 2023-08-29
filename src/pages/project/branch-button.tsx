import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ArrowDropDown, CallSplit, Delete, Edit, WarningRounded } from '@mui/icons-material';
import { Box, Button, IconButton, List, ListItemButton, ListItemText, tooltipClasses } from '@mui/material';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import joinUrl from 'url-join';

import Dropdown from '../../components/template-form/dropdown';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';
import { defaultBranch, useProjectState } from './state';

export default function BranchButton() {
  const { projectId, ref, '*': filepath } = useParams();
  if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

  const { t } = useLocaleContext();

  const navigate = useNavigate();

  const { dialog, showDialog } = useDialog();

  return (
    <>
      {dialog}

      <Dropdown
        sx={{
          [`.${tooltipClasses.tooltip}`]: {
            minWidth: 200,
            maxHeight: '60vh',
            overflow: 'auto',
          },
        }}
        dropdown={
          <BranchList
            projectId={projectId}
            _ref={ref}
            onItemClick={(branch) => branch !== ref && navigate(joinUrl('..', branch), { state: { filepath } })}
            onShowAllClick={() => {
              showDialog({
                maxWidth: 'sm',
                fullWidth: true,
                title: t('form.branch'),
                content: <AllBranches projectId={projectId} _ref={ref} filepath={filepath} />,
                cancelText: t('alert.close'),
              });
            }}
          />
        }>
        <Button startIcon={<CallSplit />} endIcon={<ArrowDropDown fontSize="small" />}>
          <Box
            component="span"
            sx={{
              display: 'block',
              maxWidth: 80,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {ref}
          </Box>
        </Button>
      </Dropdown>
    </>
  );
}

function BranchList({
  projectId,
  _ref: ref,
  onItemClick,
  onShowAllClick,
}: {
  projectId: string;
  _ref: string;
  onItemClick?: (branch: string) => any;
  onShowAllClick?: () => any;
}) {
  const { t } = useLocaleContext();

  const {
    state: { branches },
  } = useProjectState(projectId, ref);

  return (
    <List disablePadding>
      {branches.map((branch) => (
        <ListItemButton key={branch} selected={branch === ref} onClick={() => onItemClick?.(branch)}>
          <ListItemText primary={branch} primaryTypographyProps={{ noWrap: true }} />
        </ListItemButton>
      ))}
      {onShowAllClick && (
        <ListItemButton onClick={onShowAllClick}>
          <ListItemText
            primary={t('alert.showAllBranches')}
            primaryTypographyProps={{ noWrap: true, textAlign: 'center', color: 'primary.main' }}
          />
        </ListItemButton>
      )}
    </List>
  );
}

function AllBranches({ projectId, _ref: ref, filepath }: { projectId: string; _ref: string; filepath?: string }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const dataGrid = useGridApiRef();

  const { dialog, showDialog } = useDialog();

  const { state, updateBranch, deleteBranch } = useProjectState(projectId, ref);

  const rows = useMemo(() => {
    return state.branches.map((branch) => ({ branch }));
  }, [state.branches]);

  const onDelete = useCallback(
    (branch: string) => {
      showDialog({
        maxWidth: 'sm',
        fullWidth: true,
        title: (
          <Box sx={{ wordWrap: 'break-word' }}>
            <WarningRounded color="warning" sx={{ verticalAlign: 'text-bottom', mr: 0.5 }} />

            {t('alert.deleteBranch', { branch })}
          </Box>
        ),
        okText: t('alert.delete'),
        okColor: 'error',
        cancelText: t('alert.cancel'),
        onOk: async () => {
          try {
            await deleteBranch({ projectId, branch });
            if (branch === ref) navigate(joinUrl('../main', filepath || ''));
            Toast.success(t('alert.deleted'));
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
      });
    },
    [deleteBranch, filepath, navigate, projectId, ref, showDialog, t]
  );

  const columns = useMemo<GridColDef<{ branch: string }>[]>(() => {
    return [
      { flex: 1, field: 'branch', headerName: t('form.branch'), sortable: false, editable: true },
      {
        field: '',
        headerName: t('form.actions'),
        sortable: false,
        align: 'center',
        renderCell: ({ row }) => (
          <>
            <IconButton
              disabled={row.branch === defaultBranch}
              onClick={() => dataGrid.current.startCellEditMode({ id: row.branch, field: 'branch' })}>
              <Edit />
            </IconButton>
            <IconButton disabled={row.branch === defaultBranch} onClick={() => onDelete(row.branch)}>
              <Delete />
            </IconButton>
          </>
        ),
      },
    ];
  }, [dataGrid, onDelete, t]);

  return (
    <Box sx={{ height: '50vh' }}>
      {dialog}

      <DataGrid
        apiRef={dataGrid}
        getRowId={(v) => v.branch}
        rows={rows}
        columns={columns}
        hideFooterSelectedRowCount
        disableColumnMenu
        autoHeight
        isCellEditable={(p) => p.row.branch !== defaultBranch}
        pageSizeOptions={[10]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        processRowUpdate={(updated, old) => {
          const newName = updated.branch.trim();
          if (newName === old.branch) return old;
          return updateBranch({ projectId, branch: old.branch, input: { name: newName } }).then(() => {
            if (ref === old.branch) navigate(joinUrl('..', newName, filepath || ''));
            return { branch: newName };
          });
        }}
        onProcessRowUpdateError={(error) => Toast.error(getErrorMessage(error))}
      />
    </Box>
  );
}

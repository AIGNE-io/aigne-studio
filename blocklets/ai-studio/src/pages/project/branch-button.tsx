import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ArrowDropDownRounded, CallSplitRounded, WarningRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  buttonClasses,
  tooltipClasses,
} from '@mui/material';
import { DataGrid, GridColDef, useGridApiRef } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL as joinUrl } from 'ufo';

import Dropdown from '../../components/template-form/dropdown';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';
import Add from './icons/add';
import Floppy from './icons/floppy';
import Pen from './icons/pen';
import Trash from './icons/trash';
import { defaultBranch, useProjectState } from './state';

export default function BranchButton({
  projectId,
  gitRef,
  filepath,
}: {
  projectId: string;
  gitRef: string;
  filepath?: string;
}) {
  const { t } = useLocaleContext();

  const navigate = useNavigate();

  const { createBranch } = useProjectState(projectId, gitRef);

  const { dialog, showDialog, closeDialog } = useDialog();
  const { dialog: createBranchDialog, showDialog: createShowDialog } = useDialog();

  return (
    <>
      {dialog}
      {createBranchDialog}

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
            _ref={gitRef}
            onItemClick={(branch) => branch !== gitRef && navigate(joinUrl('..', branch), { state: { filepath } })}
            onShowAllClick={() => {
              showDialog({
                maxWidth: 'sm',
                fullWidth: true,
                title: (
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>{t('form.branch')}</Box>
                    <Button
                      size="small"
                      startIcon={<Add />}
                      variant="contained"
                      onClick={() => {
                        let data: { new: string; source: string };

                        createShowDialog({
                          maxWidth: 'xs',
                          fullWidth: true,
                          title: (
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              {t('newObject', { object: t('branch') })}
                            </Box>
                          ),
                          content: (
                            <CreateBranch projectId={projectId} _ref={gitRef} onChange={(_data) => (data = _data)} />
                          ),
                          cancelText: t('cancel'),
                          okIcon: <Floppy />,
                          okText: t('save'),
                          onOk: async () => {
                            try {
                              if (!data.new) {
                                throw new Error(t('alert.newBranchRequired'));
                              }

                              await createBranch({ projectId, input: { name: data.new, oid: data.source } });

                              Toast.success(t('alert.branchCreated'));
                              closeDialog();

                              navigate(joinUrl('..', data.new), { state: { filepath } });
                            } catch (error) {
                              Toast.error(getErrorMessage(error));
                              throw error;
                            }
                          },
                        });
                      }}>
                      {t('newObject', { object: t('branch') })}
                    </Button>
                  </Box>
                ),
                content: <AllBranches projectId={projectId} _ref={gitRef} filepath={filepath} />,
                cancelText: t('alert.close'),
              });
            }}
          />
        }>
        <Button
          startIcon={<CallSplitRounded />}
          endIcon={<ArrowDropDownRounded />}
          sx={{
            minHeight: 32,
            [`.${buttonClasses.startIcon}`]: { mr: 0.25 },
            [`.${buttonClasses.endIcon}`]: { ml: 0.25 },
          }}>
          <Box
            component="span"
            sx={{
              display: 'block',
              maxWidth: 40,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {gitRef}
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
    <List disablePadding dense>
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
              <Pen />
            </IconButton>
            <IconButton disabled={row.branch === defaultBranch} onClick={() => onDelete(row.branch)}>
              <Trash />
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

function CreateBranch({
  projectId,
  _ref,
  onChange,
}: {
  projectId: string;
  _ref: string;
  onChange: (data: { new: string; source: string }) => void;
}) {
  const { t } = useLocaleContext();
  const [states, setStates] = useState({ new: '', source: '' });

  const { state } = useProjectState(projectId, _ref);

  const rows = useMemo(() => {
    return state.branches.map((branch) => ({ branch }));
  }, [state.branches]);

  useEffect(() => {
    if (!states.source && rows[0]?.branch) {
      states.source = rows[0]?.branch;
    }

    onChange(states);
  }, [states, rows]);

  return (
    <Stack gap={1}>
      <Box>
        <TextField
          autoFocus
          label={t('form.name')}
          fullWidth
          value={states.new}
          onChange={(e) => setStates((r) => ({ ...r, new: e.target.value }))}
        />
      </Box>

      <Box>
        <TextField
          select
          label={t('sourceBranch')}
          fullWidth
          value={states.source || rows[0]?.branch}
          onChange={(e) => setStates((r) => ({ ...r, source: e.target.value }))}>
          {rows.map((option) => (
            <MenuItem key={option.branch} value={option.branch}>
              {option.branch}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Stack>
  );
}

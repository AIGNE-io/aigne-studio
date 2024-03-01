import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Popover,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  styled,
} from '@mui/material';
import { DataGrid, gridClasses } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PromiseLoadingButton from '../../../components/promise-loading-button';
import { useDataset } from '../../../contexts/dataset-items';
import { useDatasets } from '../../../contexts/datasets';
import { getErrorMessage } from '../../../libs/api';
import Delete from '../icons/delete';
import Empty from '../icons/empty';

export default function KnowledgeUnits() {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog', popupId: 'unit' });
  const customDialogState = usePopupState({ variant: 'dialog', popupId: 'custom' });
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } });
  const [currentUnit, setUnit] = useState<'upload' | 'discussion' | 'custom'>('upload');
  const { datasetId } = useParams();

  const { createUnit } = useDatasets();
  const navigate = useNavigate();

  const { state, refetch, remove } = useDataset(datasetId || '');
  if (state.error) throw state.error;

  const rows = state.items ?? [];
  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: t('Unit name'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{params.row.name}</Box>;
        },
      },
      {
        field: 'type',
        headerName: t('Type'),
        maxWidth: 200,
        minWidth: 120,
        headerAlign: 'center',
        align: 'center',
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{params.row.type}</Box>;
        },
      },
      {
        field: 'time',
        headerName: t('Create time'),
        width: 300,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{`${dayjs(params.row.createdAt).format('YYYY-MM-DD HH:mm:ss')}`}</Box>;
        },
      },
      {
        field: 'actions',
        headerName: t('form.actions'),
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params: any) => (
          <Actions id={params.row.id} datasetId={datasetId || ''} remove={remove} refetch={refetch} />
        ),
      },
    ],
    [t]
  );

  if (state.loading) {
    return (
      <Box flex={1} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <>
      <>
        <Stack gap={3} py={2} px={3}>
          <Breadcrumbs
            sx={{
              a: {
                color: 'rgba(29,28,35,.35)',
                textDecoration: 'auto',
              },
            }}>
            <Link color="inherit" to="../../knowledge">
              Knowledge
            </Link>

            <Typography color="text.primary">{state.dataset?.name}</Typography>
          </Breadcrumbs>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Box
                sx={{
                  fontSize: '20px',
                  fontWeight: 600,
                  lineHeight: '28px',
                }}>
                {state.dataset?.name}
              </Box>

              <Box display="flex" gap={2} alignItems="center" mt={1}>
                <Tag>{`${rows.length} Units`}</Tag>
              </Box>
            </Box>

            <Button
              variant="contained"
              size="small"
              onClick={() => {
                dialogState.open();
              }}>
              Add unit
            </Button>
          </Box>
        </Stack>

        <Divider />
        <Stack px={3} flex={1} height={0}>
          <Box sx={{ margin: '30px 0 20px', fontSize: '18px', fontWeight: 600, lineHeight: '24px' }}>Units</Box>

          <Stack flex={1}>
            {!rows?.length && <EmptyUnit onOpen={() => dialogState.open()} />}

            {rows.length && (
              <Table
                sx={{
                  border: 0,
                  [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: {
                    outline: 'none',
                  },
                  [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
                    outline: 'none',
                  },
                }}
                disableColumnMenu
                columnHeaderHeight={30}
                rowHeight={40}
                getRowId={(v) => v.id}
                rows={rows}
                columns={columns as any}
                rowCount={state.total ?? 0}
                pageSizeOptions={[20]}
                paginationModel={{ page: state.page, pageSize: state.size }}
                paginationMode="server"
                onPaginationModelChange={({ page, pageSize: size }) => refetch({ page, size })}
                onRowClick={(params) => {
                  const rowId = params.row.id;
                  navigate(rowId);
                }}
              />
            )}
          </Stack>
        </Stack>
      </>

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="md"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(() => {
          dialogState.close();

          if (currentUnit === 'custom') {
            customDialogState.open();
          } else {
            navigate(`upload?type=${currentUnit}`);
          }
        })}>
        <DialogTitle>{t('Add unit')}</DialogTitle>

        <DialogContent>
          <UnitRadioGroup
            sx={{ gap: 2 }}
            value={currentUnit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnit((e.target as any).value)}>
            <FormControlLabel
              value="upload"
              control={<Radio />}
              label={<Upload />}
              className={currentUnit === 'upload' ? 'selected' : ''}
            />
            <FormControlLabel
              value="discussion"
              control={<Radio />}
              label={<Discussion />}
              className={currentUnit === 'discussion' ? 'selected' : ''}
            />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label={<Customization />}
              className={currentUnit === 'custom' ? 'selected' : ''}
            />
          </UnitRadioGroup>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close}>{t('cancel')}</Button>

          <LoadingButton type="submit" variant="contained">
            {t('next')}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      <Dialog
        {...bindDialog(customDialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(async (data) => {
          try {
            await createUnit(datasetId || '', { type: 'text', name: data.name });
            await refetch();
            customDialogState.close();
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        })}>
        <DialogTitle>{t('Unit name')}</DialogTitle>

        <DialogContent>
          <TextField label={t('projectSetting.name')} sx={{ width: 1 }} {...form.register('name')} />
        </DialogContent>

        <DialogActions>
          <Button onClick={customDialogState.close}>{t('cancel')}</Button>

          <LoadingButton
            type="submit"
            variant="contained"
            startIcon={<SaveRounded />}
            loadingPosition="start"
            loading={form.formState.isSubmitting}>
            {t('save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Actions({
  id,
  datasetId,
  refetch,
  remove,
}: {
  id: string;
  datasetId: string;
  remove: (datasetId: string, unitId: string) => any;
  refetch: () => any;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const { t } = useLocaleContext();

  return (
    <>
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl(e.currentTarget);
        }}>
        <Delete sx={{ fontSize: '16px' }} />
      </IconButton>

      <Popover
        id={open ? 'simple-popover' : undefined}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}>
        <DialogTitle>{t('Delete this unit?')}</DialogTitle>

        <DialogContent>After deletion, references in related bots will become invalid.</DialogContent>

        <DialogActions>
          <Button size="small" onClick={() => setAnchorEl(null)}>
            {t('cancel')}
          </Button>

          <PromiseLoadingButton
            size="small"
            variant="contained"
            color="error"
            onClick={async () => {
              await remove(datasetId, id);
              await refetch();
              setAnchorEl(null);
            }}>
            {t('delete')}
          </PromiseLoadingButton>
        </DialogActions>
      </Popover>
    </>
  );
}

function EmptyUnit({ onOpen }: { onOpen: () => any }) {
  const { t } = useLocaleContext();

  return (
    <Stack flex={1} justifyContent="center" alignItems="center" gap={1}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />

      <Typography color="text.disabled">{t('No unit yet \n Click button to add a unit')}</Typography>

      <Button variant="contained" size="small" onClick={onOpen}>
        Add unit
      </Button>
    </Stack>
  );
}

function Upload() {
  return (
    <RadioStack gap={0.5}>
      <Box className="semi-radio-addon">Upload documents</Box>
      <Box className="semi-radio-extra">Upload documents in PDF, TXT, or DOCX format</Box>
    </RadioStack>
  );
}

function Discussion() {
  return (
    <RadioStack gap={0.5}>
      <Box className="semi-radio-addon">Discussion documents</Box>
      <Box className="semi-radio-extra">Get the content from the discuss documents</Box>
    </RadioStack>
  );
}

function Customization() {
  return (
    <RadioStack gap={0.5}>
      <Box className="semi-radio-addon">Customization</Box>
      <Box className="semi-radio-extra">Customize content, support creation & editing</Box>
    </RadioStack>
  );
}

const UnitRadioGroup = styled(RadioGroup)`
  .MuiFormControlLabel-root {
    border: 1px solid rgba(28, 31, 35, 0.08);
    padding: 16px;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    font-size: 14px;
    line-height: 22px;
    min-height: 20px;
    min-width: 16px;
    text-align: left;
    border-radius: 4px;
    flex-wrap: nowrap;
    align-items: flex-start;

    &.selected {
      border: 1px solid rgba(77, 83, 232, 1);
    }
  }

  .MuiRadio-root {
    padding: 0;
    padding-right: 8px;
  }
`;

const RadioStack = styled(Stack)`
  --semi-grey-9: 56, 55, 67;
  --semi-color-text-0: rgba(var(--semi-grey-9), 1);
  --semi-color-text-1: rgba(var(--semi-grey-9), 0.8);
  --semi-color-text-2: rgba(var(--semi-grey-9), 0.6);

  .semi-radio-addon {
    color: var(--semi-color-text-0);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .semi-radio-extra {
    color: var(--semi-color-text-2);
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    padding-left: 0;
  }
`;

function Tag({ children }: { children: any }) {
  return (
    <Box
      sx={{
        borderRadius: '6px',
        fontWeight: 500,
        background: 'rgba(139,139,149,0.15)',
        color: 'rgba(75,74,88,1)',
        padding: '2px 8px',
        fontSize: '12px',
        height: '20px',
        lineHeight: '16px',
      }}>
      {children}
    </Box>
  );
}

const Table = styled(DataGrid)``;

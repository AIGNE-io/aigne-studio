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
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PromiseLoadingButton from '../../components/promise-loading-button';
import { useDatasets } from '../../contexts/datasets/datasets';
import { useDataset } from '../../contexts/datasets/documents';
import { getErrorMessage } from '../../libs/api';
import Delete from '../project/icons/delete';
import Empty from '../project/icons/empty';

export default function KnowledgeDocuments() {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog', popupId: 'document' });
  const customDialogState = usePopupState({ variant: 'dialog', popupId: 'custom' });
  const form = useForm<{ name: string; content: string }>({ defaultValues: { name: '', content: '' } });
  const [currentDocument, setDocument] = useState<'file' | 'discussion' | 'custom'>('file');
  const { datasetId } = useParams();

  const { createDocument } = useDatasets();
  const navigate = useNavigate();

  const { state, refetch, remove } = useDataset(datasetId || '');
  if (state.error) throw state.error;

  const rows = state.items ?? [];
  const columns = useMemo(
    () => [
      {
        field: 'name',
        headerName: t('knowledge.documents.name'),
        flex: 1,
        sortable: false,
        renderCell: (params: any) => {
          return <Box>{params.row.name}</Box>;
        },
      },
      {
        field: 'type',
        headerName: t('knowledge.documents.type'),
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
        headerName: t('knowledge.documents.time'),
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
          <Breadcrumbs sx={{ a: { color: 'rgba(29,28,35,.35)', textDecoration: 'auto' } }}>
            <Link color="inherit" to="../../knowledge">
              {t('knowledge.menu')}
            </Link>

            <Typography color="text.primary">{state.dataset?.name}</Typography>
          </Breadcrumbs>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Box sx={{ fontSize: '20px', fontWeight: 600, lineHeight: '28px' }}>{state.dataset?.name}</Box>

              <Box display="flex" gap={2} alignItems="center" mt={1}>
                <Tag>{`${rows.length} ${t('knowledge.document')}`}</Tag>
              </Box>
            </Box>

            <Button variant="contained" size="small" onClick={dialogState.open}>
              {t('knowledge.documents.add')}
            </Button>
          </Box>
        </Stack>

        <Divider />

        <Stack px={3} flex={1} height={0}>
          <Box sx={{ margin: '30px 0 20px', fontSize: '18px', fontWeight: 600, lineHeight: '24px' }}>
            {t('knowledge.document')}
          </Box>

          <>
            {!rows?.length && (
              <Stack flex={1}>
                <EmptyDocument onOpen={dialogState.open} />
              </Stack>
            )}

            {rows.length && (
              <Table
                sx={{
                  border: 0,
                  [`& .${gridClasses.cell}:focus, & .${gridClasses.cell}:focus-within`]: { outline: 'none' },
                  [`& .${gridClasses.columnHeader}:focus, & .${gridClasses.columnHeader}:focus-within`]: {
                    outline: 'none',
                  },
                  [`& .${gridClasses.footerContainer}`]: { border: 0 },
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
          </>
        </Stack>
      </>

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="md"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(() => {
          dialogState.close();

          if (currentDocument === 'custom') {
            customDialogState.open();
          } else {
            navigate(`upload?type=${currentDocument}`);
          }
        })}>
        <DialogTitle>{t('knowledge.documents.add')}</DialogTitle>

        <DialogContent>
          <DocumentRadioGroup
            sx={{ gap: 2 }}
            value={currentDocument}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocument((e.target as any).value)}>
            <FormControlLabel
              value="file"
              control={<Radio />}
              label={<Upload />}
              className={currentDocument === 'file' ? 'selected' : ''}
            />
            <FormControlLabel
              value="discussion"
              control={<Radio />}
              label={<Discussion />}
              className={currentDocument === 'discussion' ? 'selected' : ''}
            />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label={<Customization />}
              className={currentDocument === 'custom' ? 'selected' : ''}
            />
          </DocumentRadioGroup>
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
            const document = await createDocument(datasetId || '', {
              type: 'text',
              name: data.name,
              content: data.content,
            });
            form.reset({ name: '', content: '' });

            await refetch();
            customDialogState.close();
            navigate(document.id);
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        })}>
        <DialogTitle>{t('knowledge.documents.add')}</DialogTitle>

        <DialogContent>
          <Stack gap={2}>
            <Controller
              control={form.control}
              name="name"
              rules={{
                required: t('validation.fieldRequired'),
              }}
              render={({ field, fieldState }) => {
                return (
                  <TextField
                    label={t('knowledge.documents.name')}
                    sx={{ width: 1 }}
                    {...field}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />

            <Controller
              control={form.control}
              name="content"
              render={({ field, fieldState }) => {
                return (
                  <TextField
                    label={t('knowledge.documents.content')}
                    placeholder={t('knowledge.documents.content')}
                    sx={{ width: 1 }}
                    multiline
                    rows={10}
                    {...field}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />
          </Stack>
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
  remove: (datasetId: string, documentId: string) => any;
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
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <DialogTitle>{t('knowledge.documents.deleteTitle')}</DialogTitle>

        <DialogContent sx={{ fontSize: '14px', lineHeight: '22px' }}>
          {t('knowledge.documents.deleteDescription')}
        </DialogContent>

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

function EmptyDocument({ onOpen }: { onOpen: () => any }) {
  const { t } = useLocaleContext();

  return (
    <Stack flex={1} justifyContent="center" alignItems="center" gap={1}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />

      <Typography color="text.disabled" sx={{ whiteSpace: 'break-spaces', textAlign: 'center' }}>
        {t('knowledge.documents.empty')}
      </Typography>

      <Button variant="contained" size="small" onClick={onOpen}>
        {t('knowledge.documents.add')}
      </Button>
    </Stack>
  );
}

function Upload() {
  const { t } = useLocaleContext();

  return (
    <RadioStack gap={0.5}>
      <Box className="radio-addon">{t('knowledge.documents.file.title')}</Box>
      <Box className="radio-extra">{t('knowledge.documents.file.description')}</Box>
    </RadioStack>
  );
}

function Discussion() {
  const { t } = useLocaleContext();

  return (
    <RadioStack gap={0.5}>
      <Box className="radio-addon">{t('knowledge.documents.discussion.title')}</Box>
      <Box className="radio-extra">{t('knowledge.documents.discussion.description')}</Box>
    </RadioStack>
  );
}

function Customization() {
  const { t } = useLocaleContext();

  return (
    <RadioStack gap={0.5}>
      <Box className="radio-addon">{t('knowledge.documents.custom.title')}</Box>
      <Box className="radio-extra">{t('knowledge.documents.custom.description')}</Box>
    </RadioStack>
  );
}

const DocumentRadioGroup = styled(RadioGroup)`
  .MuiFormControlLabel-root {
    border: 1px solid ${({ theme }) => theme.palette.action.selected};
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
      border: 1px solid ${({ theme }) => theme.palette.primary.main};
    }
  }

  .MuiRadio-root {
    padding: 0;
    padding-right: 8px;
  }
`;

const RadioStack = styled(Stack)`
  .radio-addon {
    color: rgba(56, 55, 67, 1);
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
  }

  .radio-extra {
    color: rgba(56, 55, 67, 0.6);
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

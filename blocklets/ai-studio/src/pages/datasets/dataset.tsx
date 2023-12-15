import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Add, ArrowBackIosNew, Error as ErrorIcon } from '@mui/icons-material';
import { Box, Breadcrumbs, Button, Chip, CircularProgress, Link, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useReactive } from 'ahooks';
import omit from 'lodash/omit';
import { useEffect, useMemo } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import DatasetItem from '../../../api/src/store/models/dataset-item';
import PromiseLoadingButton from '../../components/promise-loading-button';
import { useDataset } from '../../contexts/dataset-items';
import { getErrorMessage } from '../../libs/api';
import { processDatasetItem, watchDatasetEmbeddings } from '../../libs/dataset';

export default function DatasetPage() {
  const { datasetId } = useParams();
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { t } = useLocaleContext();

  const { state, refetch } = useDataset(datasetId);
  if (state.error) throw state.error;

  const embeddings = useReactive<{ status: { [key: string]: { total?: number; current?: number } } }>({ status: {} });

  useEffect(() => {
    const abortController = new AbortController();

    (async () => {
      const res = await watchDatasetEmbeddings({ datasetId, signal: abortController.signal });
      const reader = res.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          switch (value.type) {
            case 'list': {
              embeddings.status = Object.fromEntries(value.list.map((i) => [i.itemId, omit(i, 'itemId')]));
              break;
            }
            case 'change': {
              embeddings.status[value.itemId] ??= {};
              Object.assign(embeddings.status[value.itemId]!, omit(value, 'itemId', 'type'));
              break;
            }
            case 'complete': {
              delete embeddings.status[value.itemId];
              break;
            }
            default:
              console.warn('Unsupported event', value);
          }
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [datasetId]);

  const rows = (state.items ?? []).map((i) => ({ ...i, status: embeddings.status[i._id!] }));

  const columns = useColumns();

  return (
    <Box>
      <Box display="flex" alignItems="center" mx={2} py={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" to="../.." sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowBackIosNew sx={{ mr: 0.5, fontSize: 18 }} />
            {t('form.dataset')}
          </Link>
          <Typography color="text.primary">
            {state.dataset ? state.dataset.name || 'Unnamed' : <CircularProgress size={14} />}
          </Typography>
        </Breadcrumbs>
        <Box flex={1} />
        <Box>
          <Button variant="contained" size="small" startIcon={<Add />} component={RouterLink} to="create">
            {t('form.add')} {t('form.file')}
          </Button>
        </Box>
      </Box>

      <Box mx={2}>
        <DataGrid
          getRowId={(v) => v._id}
          loading={state.loading && !state.items?.length}
          rows={rows}
          columns={columns}
          autoHeight
          rowCount={state.total ?? 0}
          pageSizeOptions={[20]}
          paginationModel={{ page: state.page, pageSize: state.size }}
          paginationMode="server"
          onPaginationModelChange={({ page, pageSize: size }) => refetch({ page, size })}
        />
      </Box>
    </Box>
  );
}

const useColumns = (): GridColDef<DatasetItem['dataValues'] & { status?: { total?: number; current?: number } }>[] => {
  const { t } = useLocaleContext();

  return useMemo(
    () => [
      {
        field: 'type',
        headerName: t('form.type'),
        maxWidth: 200,
        minWidth: 120,
        headerAlign: 'center',
        align: 'center',
        renderCell: (params) => <Chip variant="outlined" color="primary" size="small" label={params.row.data?.type} />,
      },
      { field: 'name', headerName: t('form.name'), flex: 1 },
      {
        field: 'embeddedAt',
        headerName: t('form.processedAt'),
        width: 210,
        renderCell: (params) => {
          const { status } = params.row;

          if (status) {
            const { total, current } = status;

            return total && current ? (
              <Typography variant="caption">
                {current}/{total}
              </Typography>
            ) : null;
          }

          return (
            <>
              {params.row.embeddedAt}
              {params.row.error && (
                <Tooltip title={params.row.error}>
                  <ErrorIcon color="error" fontSize="small" sx={{ ml: 0.5 }} />
                </Tooltip>
              )}
            </>
          );
        },
      },
      {
        field: 'actions',
        headerName: t('form.actions'),
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => <Actions item={params.row} />,
      },
    ],
    [t]
  );
};

function Actions({ item }: { item: DatasetItem['dataValues'] & { status?: {} } }) {
  const { t } = useLocaleContext();
  const { refetch } = useDataset(item.datasetId);

  return (
    <PromiseLoadingButton
      loading={!!item.status}
      size="small"
      onClick={async () => {
        try {
          await processDatasetItem({ datasetId: item.datasetId, itemId: item._id! });
        } catch (error) {
          Toast.error(getErrorMessage(error));
          throw error;
        } finally {
          await refetch();
        }
      }}>
      {t('form.process')}
    </PromiseLoadingButton>
  );
}

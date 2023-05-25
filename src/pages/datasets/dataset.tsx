import Toast from '@arcblock/ux/lib/Toast';
import { Add, ArrowBackIosNew, Error as ErrorIcon } from '@mui/icons-material';
import { Box, Breadcrumbs, Button, Chip, CircularProgress, Link, Tooltip, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { DatasetItem } from '../../../api/src/store/dataset-items';
import PromiseLoadingButton from '../../components/promise-loading-button';
import { useDataset } from '../../contexts/dataset-items';
import { getErrorMessage } from '../../libs/api';
import { processDatasetItem } from '../../libs/datasets';

export default function DatasetPage() {
  const { datasetId } = useParams();
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { state } = useDataset(datasetId);
  if (state.error) throw state.error;

  return (
    <Box>
      <Box display="flex" alignItems="center" mx={2} py={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" to="../.." sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowBackIosNew sx={{ mr: 0.5, fontSize: 18 }} />
            Datasets
          </Link>
          <Typography color="text.primary">
            {state.dataset ? state.dataset.name || 'Unnamed' : <CircularProgress size={14} />}
          </Typography>
        </Breadcrumbs>
        <Box flex={1} />
        <Box>
          <Button variant="contained" size="small" startIcon={<Add />} component={RouterLink} to="create">
            Add file
          </Button>
        </Box>
      </Box>

      <Box mx={2}>
        <DataGrid
          getRowId={(v) => v._id!}
          loading={state.loading && !state.items?.length}
          rows={state.items ?? []}
          columns={columns}
          hideFooter
          autoHeight
        />
      </Box>
    </Box>
  );
}

const columns: GridColDef<DatasetItem>[] = [
  {
    field: 'type',
    headerName: 'Type',
    maxWidth: 200,
    minWidth: 120,
    headerAlign: 'center',
    align: 'center',
    renderCell: (params) => <Chip variant="outlined" color="primary" size="small" label={params.row.data?.type} />,
  },
  { field: 'name', headerName: 'Name', flex: 1 },
  {
    field: 'embeddedAt',
    headerName: 'Processed At',
    width: 210,
    renderCell: (params) => (
      <>
        {params.row.embeddedAt}
        {params.row.error && (
          <Tooltip title={params.row.error}>
            <ErrorIcon color="error" fontSize="small" sx={{ ml: 0.5 }} />
          </Tooltip>
        )}
      </>
    ),
  },
  {
    field: 'actions',
    headerName: 'Actions',
    align: 'right',
    headerAlign: 'right',
    renderCell: (params) => <Actions item={params.row} />,
  },
];

function Actions({ item }: { item: DatasetItem }) {
  const { refetch } = useDataset(item.datasetId);

  return (
    <PromiseLoadingButton
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
      Process
    </PromiseLoadingButton>
  );
}

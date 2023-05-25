import { Add, ArrowBackIosNew } from '@mui/icons-material';
import { Box, Breadcrumbs, Button, Chip, CircularProgress, Link, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { DatasetItem } from '../../../api/src/store/dataset-items';
import { useDataset } from '../../contexts/dataset-items';

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
          loading={state.loading}
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
    field: 'updatedAt',
    headerName: 'Updated At',
    align: 'center',
    headerAlign: 'center',
    width: 210,
  },
];

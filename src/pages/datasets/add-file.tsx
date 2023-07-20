import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ArrowBackIosNew, HelpOutline } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Breadcrumbs,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Link,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useThrottle } from 'ahooks';
import { useCallback, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useAsync } from 'react-use';

import { CreateItem } from '../../../api/src/routes/dataset-items';
import { useComponent } from '../../contexts/component';
import { useDataset } from '../../contexts/dataset-items';
import { getErrorMessage } from '../../libs/api';
import { createDatasetItem } from '../../libs/dataset';
import { DiscussionItem, searchDiscussions } from '../../libs/discussion';

export default function AddFilePage() {
  const { datasetId } = useParams();
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { t } = useLocaleContext();

  const { state, refetch } = useDataset(datasetId);
  if (state.error) throw state.error;

  const navigate = useNavigate();

  const discuss = useComponent('did-comments');

  const [type, setType] = useState(discuss ? 'discussion' : null);

  const [input, setInput] = useState<CreateItem[]>([]);

  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      await createDatasetItem(datasetId, input);
      refetch();
      Toast.success('Saved');
      navigate('..', { replace: true });
    } catch (error) {
      Toast.error(getErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  }, [datasetId, input, navigate, refetch]);

  return (
    <Box>
      <Box display="flex" alignItems="center" mx={2} py={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" to=".." sx={{ display: 'flex', alignItems: 'center' }}>
            <ArrowBackIosNew sx={{ mr: 0.5, fontSize: 18 }} />
            {t('form.dataset')}
          </Link>
          {state.dataset ? (
            <Link component={RouterLink} underline="hover" to=".." sx={{ display: 'flex', alignItems: 'center' }}>
              {state.dataset.name || t('alert.unnamed')}
            </Link>
          ) : (
            <CircularProgress size={14} />
          )}
          <Typography color="text.primary">
            {t('form.add')} {t('form.file')}
          </Typography>
        </Breadcrumbs>
      </Box>

      <Box m={2}>
        <ToggleButtonGroup
          exclusive
          color="primary"
          value={type}
          onChange={(_, type) => {
            if (type) setType(type);
          }}>
          <ToggleButton value="discussion" disabled={!discuss}>
            Discussion
          </ToggleButton>
          <ToggleButton value="file" disabled>
            {t('form.file')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box mx={2} my={4}>
        {type === 'discussion' ? <DiscussionTable value={input} onChange={setInput} /> : null}
      </Box>

      <Box m={2}>
        <LoadingButton
          loading={saving}
          color="primary"
          variant="contained"
          disabled={input.length === 0}
          onClick={save}>
          {t('form.save')}
        </LoadingButton>
      </Box>
    </Box>
  );
}

function DiscussionTable({ value, onChange }: { value: CreateItem[]; onChange: (value: CreateItem[]) => void }) {
  const { t } = useLocaleContext();

  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 20,
  });

  const s = useThrottle(search, { wait: 1000 });

  const {
    loading,
    value: res,
    error,
  } = useAsync(
    () =>
      searchDiscussions({
        search: s,
        page: paginationModel.page + 1,
        size: paginationModel.pageSize,
      }),
    [s, paginationModel.page, paginationModel.pageSize]
  );

  if (error) throw error;

  const selection = useMemo(() => value.map((i) => i.data!.id).filter((i): i is NonNullable<typeof i> => !!i), [value]);

  const onRowSelectionModelChange = useCallback(
    (ids: any[]) => {
      onChange([
        ...ids.map(
          (i) =>
            value.find((item) => item.data?.id === i) ?? {
              name: res?.data.find((item) => item.id === i)?.title || '',
              data: { type: 'discussion', id: i } as const,
            }
        ),
        ...value.filter((i) => !i.data?.id),
      ]);
    },
    [onChange, res?.data, value]
  );

  const meilisearch = useComponent('meilisearch');
  const fullSite = value.some((i) => i.data?.fullSite);

  const columns = useColumns();

  return (
    <>
      <Box my={2} display="flex" alignItems="center">
        <FormControlLabel
          checked={fullSite}
          onChange={(_, checked) => {
            if (checked) {
              onChange([{ name: 'Discussion Full Site', data: { type: 'discussion', fullSite: true } }]);
            } else {
              onChange(value.filter((i) => !i.data?.fullSite));
            }
          }}
          control={<Checkbox />}
          label={t('form.fullSite')}
        />
        <Tooltip title={t('form.fullSiteTip')}>
          <HelpOutline fontSize="small" />
        </Tooltip>
      </Box>

      {meilisearch && (
        <Box mb={2}>
          <TextField
            label={t('alert.search')}
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
      )}

      <DataGrid
        loading={loading}
        rows={res?.data ?? []}
        columns={columns}
        autoHeight
        checkboxSelection={!fullSite}
        rowSelectionModel={selection}
        onRowSelectionModelChange={onRowSelectionModelChange}
        keepNonExistentRowsSelected
        rowCount={res?.total || 0}
        pageSizeOptions={[20]}
        paginationModel={paginationModel}
        paginationMode="server"
        onPaginationModelChange={setPaginationModel}
      />
    </>
  );
}

const useColumns = (): GridColDef<DiscussionItem>[] => {
  const { t } = useLocaleContext();

  return useMemo(
    () => [
      { field: 'title', headerName: t('form.title'), flex: 2 },
      {
        field: 'author',
        headerName: t('form.author'),
        flex: 1,
        maxWidth: 200,
        valueGetter: (params) => params.row.author.fullName,
      },
      {
        field: 'createdAt',
        headerName: t('form.createdAt'),
        align: 'center',
        headerAlign: 'center',
        width: 210,
      },
    ],
    [t]
  );
};

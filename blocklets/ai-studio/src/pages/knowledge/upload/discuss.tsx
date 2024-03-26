import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { LoadingButton } from '@mui/lab';
import { Box, Checkbox, FormControlLabel, TextField, Tooltip } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useThrottle } from 'ahooks';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsync } from 'react-use';

import { CreateDiscussionItem } from '../../../../api/src/routes/dataset/documents';
import { useComponent } from '../../../contexts/component';
import { useDocuments } from '../../../contexts/datasets/documents';
import { getErrorMessage } from '../../../libs/api';
import { createDatasetDocuments } from '../../../libs/dataset';
import { DiscussionItem, searchDiscussions } from '../../../libs/discussion';
import InfoOutlined from '../../project/icons/question';

export default function DiscussionPage({ datasetId }: { datasetId: string }) {
  if (!datasetId) {
    throw new Error('Missing required params `datasetId`');
  }

  const { t } = useLocaleContext();

  const { state, refetch } = useDocuments(datasetId);
  if (state.error) throw state.error;

  const navigate = useNavigate();

  const [input, setInput] = useState<CreateDiscussionItem[]>([]);

  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    try {
      setSaving(true);
      await createDatasetDocuments(datasetId, input);
      refetch();
      Toast.success(t('alert.saved'));
      navigate(`../${datasetId}`, { replace: true });
    } catch (error) {
      Toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [datasetId, input, navigate, refetch]);

  return (
    <Box>
      <Box mx={2} my={4}>
        <DiscussionTable
          value={input}
          onChange={(data) => {
            setInput(data);
          }}
        />
      </Box>

      <Box m={2}>
        <LoadingButton
          loading={saving}
          color="primary"
          variant="contained"
          disabled={input.length === 0}
          onClick={save}>
          {t('save')}
        </LoadingButton>
      </Box>
    </Box>
  );
}

const types = ['discussion', 'blog', 'doc'];

function CheckBoxGroup({ value, onChange }: { value: string[]; onChange: (data: string[]) => any }) {
  const { t } = useLocaleContext();

  const [checkedValues, setCheckedValues] = useState(value);

  const handleChange = (event: any) => {
    const { name, checked } = event.target;
    const newCheckedValues = checked ? [...checkedValues, name] : checkedValues.filter((value) => value !== name);

    if (newCheckedValues.length > 0) {
      setCheckedValues(newCheckedValues);
      onChange(newCheckedValues);
    } else {
      Toast.warning(t('atLeastOne'));
    }
  };

  return (
    <Box>
      {types.map((name) => (
        <FormControlLabel
          key={name}
          control={<Checkbox checked={checkedValues.includes(name)} onChange={handleChange} name={name} />}
          label={t(name)}
        />
      ))}
    </Box>
  );
}

function DiscussionTable({
  value,
  onChange,
}: {
  value: CreateDiscussionItem[];
  onChange: (value: CreateDiscussionItem[]) => void;
}) {
  const { t } = useLocaleContext();

  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 });
  const s = useThrottle(search, { wait: 1000 });

  const {
    loading,
    value: res,
    error,
  } = useAsync(
    () => searchDiscussions({ search: s, page: paginationModel.page + 1, size: paginationModel.pageSize }),
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
      <Box sx={{ mb: 4 }}>
        <FormControlLabel
          checked={fullSite}
          onChange={(_, checked) => {
            if (checked) {
              onChange([
                {
                  name: 'Discussion Full Site',
                  data: { type: 'discussion', fullSite: true, id: '', types },
                },
              ]);
            } else {
              onChange(value.filter((i) => !i.data?.fullSite));
            }
          }}
          control={<Checkbox />}
          label={
            <Box display="flex" gap={1} alignItems="center">
              <Box mt="-2px">{t('form.fullSite')}</Box>

              <Tooltip title={t('form.fullSiteTip')}>
                <InfoOutlined fontSize="small" sx={{ color: 'info.main', fontSize: 14 }} />
              </Tooltip>
            </Box>
          }
        />

        {fullSite && (
          <Box display="flex" alignItems="center">
            <Box mt={-0.2}>{`${t('types')}:`}</Box>

            <CheckBoxGroup
              value={types || []}
              onChange={(val) => {
                const full = value.find((i) => i.data?.fullSite);
                if (full) full.data.types = val;
                onChange(value);
              }}
            />
          </Box>
        )}
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

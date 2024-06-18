import { useComponent } from '@app/contexts/component';
import { CreateDiscussionItem } from '@app/libs/dataset';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useThrottle } from 'ahooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { DiscussionItem, searchDiscussions } from '../../libs/discussion';

function DiscussionTable({
  type,
  value,
  onChange,
}: {
  type: CreateDiscussionItem['data']['type'];
  value: CreateDiscussionItem['data'][];
  onChange: (value: CreateDiscussionItem['data'][]) => void;
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
    () => searchDiscussions({ search: s, page: paginationModel.page + 1, size: paginationModel.pageSize, type }),
    [s, paginationModel.page, paginationModel.pageSize, type]
  );

  useEffect(() => {
    if (error) {
      Toast.error((error as any)?.response?.data?.error ?? error?.message);
    }
  }, [error]);

  const selection = useMemo(() => value.map((i) => i!.id).filter((i): i is NonNullable<typeof i> => !!i), [value]);

  const onRowSelectionModelChange = useCallback(
    (ids: any[]) => {
      onChange([
        ...ids.map(
          (i: any) =>
            value.find((item) => item?.id === i) ?? {
              id: i,
              title: (res?.data || []).find((x) => x.id === i)?.title || '',
              type,
              from: 'discussion' as const,
              boardId: (res?.data || []).find((x) => x.id === i)?.boardId || '',
            }
        ),
      ]);
    },
    [onChange, res?.data, value]
  );

  const meilisearch = useComponent('meilisearch');

  const columns = useColumns();

  return (
    <>
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
        sx={{
          border: 0,
          '& .MuiDataGrid-columnHeaders': {
            display: 'none',
          },
        }}
        loading={loading}
        rows={res?.data ?? []}
        columns={columns}
        checkboxSelection
        autoHeight
        rowSelectionModel={selection}
        onRowSelectionModelChange={onRowSelectionModelChange}
        keepNonExistentRowsSelected
        rowCount={res?.total || 0}
        pageSizeOptions={[20]}
        paginationModel={paginationModel}
        paginationMode="server"
        onPaginationModelChange={setPaginationModel}
        getRowHeight={() => {
          return 'auto';
        }}
      />
    </>
  );
}

const useColumns = (): GridColDef<DiscussionItem>[] => {
  const { t } = useLocaleContext();

  return useMemo(
    () => [
      {
        field: 'title',
        headerName: t('title'),
        flex: 1,
        valueGetter: (params) => params.row.title || t('unnamed'),
      },
    ],
    [t]
  );
};

export default DiscussionTable;

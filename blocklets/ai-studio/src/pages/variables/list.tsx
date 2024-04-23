import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { Box } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { uniq } from 'lodash';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import SegmentedControl from '../project/segmented-control';
import { PROMPTS_FOLDER_NAME, useProjectStore } from '../project/yjs-state';

function VariableList() {
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
  const { projectId, ref: gitRef } = useParams();
  const { t } = useLocaleContext();
  const [scope, setScope] = useState('global');

  const { synced, store, getVariables, getFileById } = useProjectStore(projectId || '', gitRef || '', true);
  const variableYjs = getVariables();

  const list = useMemo(() => {
    const filterVariables = (variableYjs?.variables || []).filter((x) => x.scope === scope);
    const map: { [key: string]: any } = {};
    const assistants = Object.entries(store.tree)
      .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
      .map(([id]) => store.files[id])
      .filter((i): i is AssistantYjs => !!i && isAssistant(i));

    assistants.forEach((assistant) => {
      Object.values(assistant.parameters || {}).forEach((parameter) => {
        if (parameter.data.source?.variableFrom === 'datastore') {
          const s = parameter.data.source;
          const key: string = `${s.scope?.scope || ''}_${s.scope?.key || ''}_${s.scope?.dataType || ''}`;
          map[key] ??= [];
          map[key].push(assistant.id);
        }
      });

      Object.values(assistant.outputVariables || {}).forEach((output) => {
        if (output?.data?.datastore && output?.data?.datastore?.key) {
          const s = output.data.datastore;
          const key: string = `${s?.scope || ''}_${s?.key || ''}_${s?.dataType || ''}`;
          map[key] ??= [];
          map[key].push(assistant.id);
        }
      });
    });

    const list = filterVariables
      .splice(paginationModel.page * paginationModel.pageSize, paginationModel.pageSize)
      .map((x) => {
        const key: string = `${x?.scope || ''}_${x?.key || ''}_${x?.dataType || ''}`;
        return { ...x, assistants: uniq(map[key] || []) };
      });

    return {
      list,
      count: list.length,
    };
  }, [scope, synced, paginationModel.page, paginationModel.pageSize]);

  const columns = useMemo(
    () => [
      {
        field: 'title',
        headerName: t('variables.name'),
        flex: 1,
        renderCell: (params: any) => params.row?.key || t('unnamed'),
      },
      {
        field: 'count',
        headerName: t('variables.dataType'),
        flex: 1,
        renderCell: (params) => {
          return <Box>{params.row?.dataType}</Box>;
        },
      },
      {
        field: 'useAssistant',
        headerName: t('variables.useAssistant'),
        flex: 1,
        renderCell: (params) => {
          return (
            <Box>
              {(params.row.assistants || [])
                .map((id: string) => getFileById(id)?.name)
                .filter((x: any) => x)
                .join(',')}
            </Box>
          );
        },
      },
    ],
    [t]
  );

  return (
    <Box p={2.5}>
      <Box mb={2.5} className="center">
        <SegmentedControl
          value={scope}
          options={[
            { value: 'global', label: t('variableParameter.global') },
            { value: 'user', label: t('variableParameter.user') },
            { value: 'session', label: t('variableParameter.session') },
          ]}
          onChange={(value) => {
            if (value) setScope(value);
          }}
        />
      </Box>

      <DataGrid
        loading={!synced}
        rows={list?.list ?? []}
        columns={columns}
        autoHeight
        disableColumnMenu
        rowSelectionModel={undefined}
        getRowId={(row) => `${row.key}-${row.scope}-${row.dataType}` || 'default'}
        keepNonExistentRowsSelected
        rowCount={list?.count || 0}
        pageSizeOptions={[10]}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />
    </Box>
  );
}

export default VariableList;

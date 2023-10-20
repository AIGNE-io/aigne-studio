import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NodeModel } from '@minoru/react-dnd-treeview';
import { Autocomplete, Box, Checkbox, CircularProgress, FormControlLabel, Stack, TextField } from '@mui/material';
import groupBy from 'lodash/groupBy';
import { useEffect, useMemo, useState } from 'react';
import joinUrl from 'url-join';

import { EntryWithMeta } from '../../../../api/src/routes/tree';
import useRequest from './state';

type TreeNode = NodeModel<EntryWithMeta>;

function mergeByParent(data: (TreeNode & { children?: any[]; type: string })[]) {
  const grouped = groupBy(data, 'parent');

  return (grouped[''] || []).map((item) => {
    item.children = grouped[item.id] || [];
    return item;
  });
}

export default function ImportFrom({
  projectId,
  onChange,
}: {
  projectId: string;
  onChange: (data: { [key: string]: boolean }, projectId: string, ref: string) => void;
}) {
  const { t } = useLocaleContext();

  const [state, setState, { refetch }] = useRequest(projectId);

  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});

  const handleChange = (id: string, checked: boolean) => {
    setSelected((r) => ({ ...r, [id]: checked }));
  };

  const projectValue = useMemo(() => {
    return state.projects.find((x) => x._id === state.projectId);
  }, [state.projects, state.projectId]);

  const tree = useMemo<(TreeNode & { type: string })[]>(() => {
    if (!state.files) return [];

    return state.files.map((item) => ({
      id: joinUrl(...item.parent, item.name),
      parent: item.parent.join('/') || '',
      text: item.name,
      data: item,
      type: item.type,
    }));
  }, [state.files]);

  const mergedData = mergeByParent(tree);

  useEffect(() => {
    onChange(selected, state.projectId, state.ref);
  }, [selected, state]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" alignItems="center" pt={2} gap={2}>
        <Autocomplete
          style={{ flex: 1 }}
          disableClearable
          // @ts-ignore
          value={projectValue || ''}
          options={state.projects}
          renderInput={(params) => <TextField {...params} size="small" label={t('import.selectProject')} />}
          isOptionEqualToValue={(o, v) => o?._id === v?._id}
          getOptionLabel={(v) => v?.name || t('unnamed')}
          onChange={(_e, newValue) => {
            setSelected({});
            setState((r: any) => ({ ...r, projectId: newValue._id, ref: 'main' }));
            refetch({ projectId: newValue._id, ref: 'main' });
          }}
        />

        <Autocomplete
          style={{ flex: 1 }}
          disableClearable
          value={state.ref}
          options={state.branches}
          renderInput={(params) => <TextField {...params} size="small" label={t('import.selectBranch')} />}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={(v) => v}
          onChange={(_e, newValue) => {
            setSelected({});
            setState((r: any) => ({ ...r, ref: newValue }));
            refetch({ projectId: state.projectId, ref: newValue });
          }}
        />
      </Box>

      {state.loading ? (
        <Box display="center" justifyContent="center" alignItems="center" width={1} height={150}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <Box flex={1} height={0} overflow="auto" mb={7}>
          <Box component="h3">{t('import.templates')}</Box>

          {mergedData.map((item) => {
            // @ts-ignore
            const name = item.type === 'file' ? item?.data?.meta?.name || t('alert.unnamed') : item.text;

            const isChecked = () => {
              if (item.type === 'folder') {
                return (item.children || [])
                  .map((x): any => {
                    return Boolean(selected[x.text]);
                  })
                  .every((x) => Boolean(x));
              }

              return Boolean(selected[item.text]);
            };

            const onChangeParent = (item: any, checked: boolean) => {
              if (item.type === 'folder') {
                (item.children || []).forEach((x: any) => {
                  handleChange(x.text, checked);
                });
              } else {
                handleChange(item.text, checked);
              }
            };

            return (
              <Stack key={item.id} pl={1} mb={0.25}>
                <FormControlLabel
                  sx={{ pl: 0 }}
                  disabled={item.type === 'folder' && !item.children?.length}
                  label={name}
                  control={
                    <Checkbox
                      size="small"
                      checked={isChecked()}
                      onChange={(e) => {
                        onChangeParent(item, e.target.checked);
                      }}
                    />
                  }
                />

                {item.children?.map((children) => {
                  return (
                    <Stack key={children.id}>
                      <FormControlLabel
                        sx={{ pl: 4 }}
                        label={children?.data?.meta?.name || t('alert.unnamed')}
                        control={
                          <Checkbox
                            size="small"
                            checked={Boolean(selected[children.text])}
                            onChange={(e) => {
                              handleChange(children.text, e.target.checked);
                            }}
                          />
                        }
                      />
                    </Stack>
                  );
                })}
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

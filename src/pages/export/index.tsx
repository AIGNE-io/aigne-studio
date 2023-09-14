import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { NodeModel } from '@minoru/react-dnd-treeview';
// import styled from '@emotion/styled';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import _ from 'lodash';
import { useCallback, useMemo, useState } from 'react';
import joinUrl from 'url-join';

import { EntryWithMeta } from '../../../api/src/routes/tree';
import { createExport } from '../../libs/export';
import useDialog from '../../utils/use-dialog';
import useRequest from './state';

type TreeNode = NodeModel<EntryWithMeta>;

function mergeByParent(data: (TreeNode & { children?: any[]; type: string })[]) {
  const grouped = _.groupBy(data, 'parent');
  return _.map(grouped[''], (item) => {
    item.children = grouped[item.id] || [];
    return item;
  });
}

export default function ImportRoutes() {
  const { t } = useLocaleContext();

  const [state, setState, { init, exported, removed, refetch }] = useRequest();
  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const { dialog, showDialog, closeDialog } = useDialog();

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

  const checked = useMemo(() => {
    return { ...exported, ...selected };
  }, [exported, selected]);

  const onExport = async () => {
    setLoading(true);
    try {
      const templates = Object.keys(checked).filter((key: string): boolean => Boolean(checked[key]));
      await createExport({ projectId: state.projectId, ref: state.ref, templates });

      init();

      Toast.success('Success');
    } catch (error) {
      Toast.error(error?.message);
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = () => {
    const templates = Object.keys(checked).filter((key: string): boolean => Boolean(checked[key]));

    const list: any[] = state.files.filter((f) => {
      const found = templates.find((t) => t === f.name);
      return found;
    });

    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: t('alert.export'),
      content: (
        <Box>
          <Box component="h3">{t('export.confirmTip', { projectName: projectValue?.name, refName: state?.ref })}</Box>

          <Box component="ul" sx={{ pl: 2 }}>
            {list.map((template) => (
              <Box key={template.meta.id} component="li" sx={{ wordWrap: 'break-word' }}>
                {template.meta.name || template.meta.id}
              </Box>
            ))}
          </Box>
        </Box>
      ),
      cancelText: t('alert.cancel'),
      okText: t('alert.export'),
      onOk: () => onExport(),
      onCancel: () => closeDialog(),
    });
  };

  const isAdded = useCallback(
    (id: string) => {
      return !exported[id] && !!selected[id];
    },
    [exported, selected]
  );

  const isRemoved = useCallback(
    (id: string) => {
      return !!exported[id] && selected[id] === false;
    },
    [exported, selected]
  );

  const disabled = !Object.keys(checked).filter((key: string): boolean => Boolean(checked[key])).length;

  return (
    <Container sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" alignItems="center" pt={2} gap={2}>
        <Autocomplete
          style={{ flex: 1 }}
          disableClearable
          // @ts-ignore
          value={projectValue || ''}
          options={state.projects}
          renderInput={(params) => <TextField {...params} size="small" label={t('export.selectProject')} />}
          isOptionEqualToValue={(o, v) => o?._id === v?._id}
          getOptionLabel={(v) => v?.name || ''}
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
          renderInput={(params) => <TextField {...params} size="small" label={t('export.selectBranch')} />}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionLabel={(v) => v}
          onChange={(_e, newValue) => {
            setSelected({});
            setState((r: any) => ({ ...r, ref: newValue }));
            refetch({ projectId: state.projectId, ref: newValue });
          }}
        />

        <Button variant="contained" onClick={onConfirm} disabled={disabled || loading}>
          {t('alert.export')}
        </Button>
      </Box>

      {state.loading ? (
        <Box flex={1} display="center" justifyContent="center" alignItems="center" width={1} height={1}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <Box flex={1} height={0} overflow="auto">
          {!!removed.length && (
            <Box my={2}>
              <Alert severity="warning">
                {t('export.alert', {
                  templates: removed.map((x: any) => x.name).join(','),
                })}
              </Alert>
            </Box>
          )}

          <Box component="h3">{t('export.templates')}</Box>

          {mergedData.map((item) => {
            // @ts-ignore
            const name = item.type === 'file' ? item?.data?.meta?.name || t('alert.unnamed') : item.text;
            const getBackground = (text: string) => (isAdded(text) ? '#e6ffec' : isRemoved(text) ? '#ffebe9' : '');

            return (
              <Stack key={item.id}>
                <FormControlLabel
                  sx={{
                    position: 'relative',
                    pl: 0,
                    pr: 2,
                    py: 0.5,
                    background: getBackground(item.text),
                  }}
                  disabled={item.type === 'folder'}
                  label={name}
                  control={
                    <>
                      {isAdded(item.text) ? (
                        <Box width={10} bgcolor="#abf2bc" />
                      ) : isRemoved(item.text) ? (
                        <Box width={10} bgcolor="rgba(255,129,130,0.4)" />
                      ) : (
                        ''
                      )}

                      <Checkbox
                        checked={Boolean(checked[item.text])}
                        onChange={(e) => {
                          handleChange(item.text, e.target.checked);
                        }}
                      />
                    </>
                  }
                />

                {item.children?.map((children) => {
                  return (
                    <Stack key={children.id}>
                      <FormControlLabel
                        sx={{
                          position: 'relative',
                          pl: 4,
                          pr: 2,
                          py: 0.5,
                          background: getBackground(children.text),
                        }}
                        label={children?.data?.meta?.name || t('alert.unnamed')}
                        control={
                          <>
                            {isAdded(children.text) ? (
                              <Box width={10} bgcolor="#abf2bc" />
                            ) : isRemoved(children.text) ? (
                              <Box width={10} bgcolor="rgba(255,129,130,0.4)" />
                            ) : (
                              ''
                            )}

                            <Checkbox
                              checked={Boolean(checked[children.text])}
                              onChange={(e) => {
                                handleChange(children.text, e.target.checked);
                              }}
                            />
                          </>
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

      {dialog}
    </Container>
  );
}

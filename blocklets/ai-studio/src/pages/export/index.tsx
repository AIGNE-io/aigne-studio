import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { NodeModel } from '@minoru/react-dnd-treeview';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
} from '@mui/material';
import groupBy from 'lodash/groupBy';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import joinUrl from 'url-join';

import { EntryWithMeta } from '../../../api/src/routes/tree';
import { createExport } from '../../libs/export';
import useDialog from '../../utils/use-dialog';
import useRequest from './state';

type TreeNode = NodeModel<EntryWithMeta>;

function mergeByParent(data: (TreeNode & { children?: any[]; type: string })[]) {
  const grouped = groupBy(data, 'parent');

  return (grouped[''] || []).map((item) => {
    item.children = grouped[item.id] || [];
    return item;
  });
}

export default function ExportRoutes() {
  const { t } = useLocaleContext();
  const [searchParams] = useSearchParams();

  const readonly = searchParams.get('readonly');
  const projectId = searchParams.get('projectId');
  const releaseId = searchParams.get('releaseId');

  const [state, setState, { init, exported, removed, refetch }] = useRequest({
    projectId: projectId || '',
    releaseId: releaseId || '',
  });

  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(false);
  const { dialog, showDialog, closeDialog } = useDialog();

  const isReadonly = useMemo(() => {
    return String(readonly) === '1';
  }, [readonly]);

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

  const checkedList = useMemo(() => {
    return mergedData.map((item) => {
      const children = (item.children || []).map((x) => ({ ...x, checked: checked[x.text] }));
      const hasChecked = children.some((x) => x.checked);
      return {
        ...item,
        checked: hasChecked || checked[item.text],
        children,
      };
    });
  }, [mergedData, checked]);

  const onExport = async () => {
    setLoading(true);
    try {
      const templates = Object.keys(checked).filter((key: string): boolean => Boolean(checked[key]));
      await createExport({
        projectId: state.projectId,
        ref: state.ref,
        templates,
        resource: {
          projectId: projectId || '',
          releaseId: releaseId || '',
        },
      });

      init();

      Toast.success('Success');
    } catch (error) {
      Toast.error(error?.message);
    } finally {
      setLoading(false);
    }
  };

  const onConfirm = () => {
    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: t('alert.export'),
      content: (
        <Box>
          <Box component="h3">{t('export.confirmTip', { projectName: projectValue?.name, refName: state?.ref })}</Box>

          <Box component="ul" sx={{ pl: 2 }}>
            {checkedList.map((template) => {
              if (template.checked) {
                // @ts-ignore
                const meta = template.data?.meta || {};
                const children = (template.children || []).filter((x) => x.checked);

                return (
                  <>
                    <Box key={meta.id} component="li" sx={{ wordWrap: 'break-word' }}>
                      {children?.length ? template.text || template.id : meta.name || meta.id}
                    </Box>

                    {children.map((child: any) => {
                      // @ts-ignore
                      const meta1 = child.data?.meta || {};
                      return (
                        <Box key={meta1.id} component="li" sx={{ wordWrap: 'break-word' }} ml={4}>
                          {meta1.name || meta1.id}
                        </Box>
                      );
                    })}
                  </>
                );
              }

              return null;
            })}
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isReadonly && (
        <Box display="flex" alignItems="center" pt={2} gap={2}>
          <Autocomplete
            style={{ flex: 1 }}
            disableClearable
            // @ts-ignore
            value={projectValue || ''}
            options={state.projects}
            renderInput={(params) => (
              <TextField {...params} size="small" label={t('export.selectProject')} disabled={isReadonly} />
            )}
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
            renderInput={(params) => (
              <TextField {...params} size="small" label={t('export.selectBranch')} disabled={isReadonly} />
            )}
            isOptionEqualToValue={(o, v) => o === v}
            getOptionLabel={(v) => v}
            onChange={(_e, newValue) => {
              setSelected({});
              setState((r: any) => ({ ...r, ref: newValue }));
              refetch({ projectId: state.projectId, ref: newValue });
            }}
          />
        </Box>
      )}

      {state.loading ? (
        <Box flex={1} display="center" justifyContent="center" alignItems="center" width={1} height={1}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <Box flex={1} height={0} overflow="auto" mt={2} mb={7}>
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

            const isChecked = () => {
              if (item.type === 'folder') {
                return (item.children || [])
                  .map((x): any => {
                    return Boolean(checked[x.text]);
                  })
                  .every((x) => Boolean(x));
              }

              return Boolean(checked[item.text]);
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
                  sx={{
                    pl: 0,
                    background: getBackground(item.text),
                  }}
                  disabled={(item.type === 'folder' && !item.children?.length) || isReadonly}
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
                        sx={{
                          pl: 4,
                          background: getBackground(children.text),
                        }}
                        label={children?.data?.meta?.name || t('alert.unnamed')}
                        disabled={isReadonly}
                        control={
                          <Checkbox
                            size="small"
                            checked={Boolean(checked[children.text])}
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

      <Box sx={{ position: 'sticky', bottom: 40 }}>
        {!isReadonly && (
          <Button variant="contained" onClick={onConfirm} disabled={disabled || loading} sx={{ width: 1 }}>
            {t('alert.export')}
          </Button>
        )}
      </Box>

      {dialog}
    </Box>
  );
}

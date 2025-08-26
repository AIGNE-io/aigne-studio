import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  Autocomplete,
  Box,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { joinURL } from 'ufo';

import WarningCircle from '../icons/warning-circle';
import useRequest from './state';
import getDepTemplates, { TreeNode } from './utils';

export default function ImportFrom({
  projectId,
  gitRef,
  onChange,
}: {
  projectId: string;
  gitRef: string;
  onChange: (data: { [key: string]: boolean }, projectId: string, ref: string) => void;
}) {
  const { t } = useLocaleContext();

  const [selectAll, setSelectAll] = useState(false);
  const [state, setState, { refetch }] = useRequest(projectId, gitRef);
  const counts = useRef<{ [key: string]: number }>({});
  const deps = useRef<{ [key: string]: TreeNode[] }>({});

  const [selected, setSelected] = useState<{ [key: string]: boolean }>({});

  const handleChange = (id: string, checked: boolean) => {
    setSelected((r) => ({ ...r, [id]: checked }));
  };

  const projectValue = useMemo(() => {
    return state.projects.find((x) => x.id === state.projectId);
  }, [state.projects, state.projectId]);

  const tree = useMemo<TreeNode[]>(() => {
    if (!state.files) return [];

    return state.files.map((item) => ({
      id: joinURL('', ...item.parent, item.name),
      parent: item.parent.slice(1).join(' / ') || '',
      text: item.name,
      data: item.type === 'file' ? item.meta : undefined,
      type: item.type,
    })) as any;
  }, [state.files]);

  const setDepCounts = (list: TreeNode[], isChecked: boolean) => {
    list.forEach((item: TreeNode) => {
      counts.current[item.text] = counts.current[item.text] ?? 0;

      if (isChecked) {
        counts.current[item.text]!++;
      } else {
        counts.current[item.text]!--;
      }
    });
  };

  const isChecked = (item: TreeNode) => {
    return Boolean(ids[item.text]);
  };

  const onChangeParent = (item: TreeNode, checked: boolean) => {
    const temps = getDepTemplates(tree, item.text);
    deps.current[item.text] = temps;
    setDepCounts(temps, checked);
    handleChange(item.text, checked);
  };

  const ids = useMemo(() => {
    const obj: { [key: string]: boolean } = {};

    Object.keys(counts.current).forEach((key) => {
      if (Number(counts.current[key]) > 0) {
        obj[key] = true;
      } else {
        delete counts.current[key];
      }
    });

    return { ...selected, ...obj };
  }, [selected, counts]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    tree.forEach((item) => onChangeParent(item, checked));
  };

  const getName = (file: TreeNode) => {
    return file.type === 'file' ? file.data?.name || t('alert.unnamed') : file.text;
  };

  useEffect(() => {
    onChange(ids, state.projectId, state.ref);
  }, [ids, state]);

  useEffect(() => {
    const allSelected = tree.every((item) => isChecked(item));
    setSelectAll(allSelected);
  }, [ids, tree]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}>
        <Autocomplete
          key={Boolean(projectValue).toString()}
          disabled={!state.projects?.length}
          style={{ flex: 1 }}
          disableClearable
          value={projectValue}
          options={state.projects}
          renderInput={(params) => (
            <TextField data-testid="import-from-select-project" {...params} label={t('import.selectProject')} />
          )}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          getOptionLabel={(v) => v.name || t('unnamed')}
          onChange={(_e, newValue) => {
            setSelectAll(false);
            setSelected({});
            setState((r) => ({ ...r, projectId: newValue.id! }));
            refetch({ projectId: newValue.id!, ref: state.ref! });
          }}
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.id}>
              {option.name || t('unnamed')}
            </Box>
          )}
        />

        <Autocomplete
          disabled={!state.projects?.length}
          style={{ flex: 1 }}
          disableClearable
          value={state.projects?.length ? state.ref : ''}
          options={state.branches}
          renderInput={(params) => <TextField {...params} label={t('import.selectBranch')} />}
          isOptionEqualToValue={(o, v) => o === v}
          getOptionDisabled={(option) => option === gitRef && state.projectId === projectId}
          getOptionLabel={(v) => v}
          onChange={(_e, newValue) => {
            setSelectAll(false);
            setSelected({});
            setState((r) => ({ ...r, ref: newValue }));
            refetch({ projectId: state.projectId!, ref: newValue! });
          }}
        />
      </Box>
      {state.loading ? (
        <Box
          sx={{
            display: 'center',
            justifyContent: 'center',
            alignItems: 'center',
            width: 1,
            height: 150,
          }}>
          <CircularProgress size={30} />
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            height: 0,
            overflow: 'auto',
            mb: 7,
          }}>
          <Box component="h4">{t('agents')}</Box>

          {!tree.length && (
            <Box
              sx={{
                fontSize: 12,
                color: (theme) => theme.palette.text.disabled,
              }}>
              {t('import.empty')}
            </Box>
          )}

          {!!tree.length && (
            <FormControlLabel
              control={
                <Checkbox size="small" checked={selectAll} onChange={(e) => handleSelectAll(e.target.checked)} />
              }
              label={t('selectAll')}
            />
          )}

          {tree.map((item) => {
            const name = getName(item);

            return (
              <Stack
                key={item.id}
                sx={{
                  mb: 0.25,
                }}>
                <FormControlLabel
                  sx={{ pl: 0 }}
                  disabled={Boolean(Number(counts.current[item.text]) > 0)}
                  label={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                      {item.parent && (
                        <Box
                          sx={{
                            mr: 1,
                            color: 'text.secondary',
                          }}>{`${item.parent} / `}</Box>
                      )}

                      <Box>{name}</Box>

                      {Boolean(selected[item.text]) && !!(deps.current[item.text] || []).length && (
                        <Tooltip
                          title={[
                            `${t('dependents')}: `,
                            (deps.current[item.text] || []).map((item) => (
                              <Box
                                sx={{
                                  pl: 1,
                                }}>
                                {getName(item)}
                              </Box>
                            )),
                          ]}>
                          <Box
                            sx={{
                              display: 'flex',
                              color: 'primary.main',
                              ml: 1,
                            }}>
                            <WarningCircle sx={{ fontSize: 18 }} />
                          </Box>
                        </Tooltip>
                      )}
                    </Box>
                  }
                  control={
                    <Checkbox
                      size="small"
                      checked={isChecked(item)}
                      onChange={(e) => {
                        onChangeParent(item, e.target.checked);
                      }}
                    />
                  }
                />
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, CircularProgress, Divider, MenuItem, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import TemplateFormView from '../../components/template-form';
import { getTemplate } from '../../libs/template';
import Empty from './icons/empty';
import SettingView from './setting-view';
import { useProjectState } from './state';
import { isTemplate, templateYjsFromTemplate, useStore } from './yjs-state';

export function CompareComponent({
  projectId,
  gitRef,
  filepath,
}: {
  projectId: string;
  gitRef: string;
  filepath: string;
}) {
  const { t } = useLocaleContext();
  const {
    state: { commits },
  } = useProjectState(projectId, gitRef);
  const { store } = useStore(projectId, gitRef);

  const [commit, setCommit] = useState(gitRef);

  const [state, setState] = useState<{
    loading: boolean;
    template?: TemplateYjs;
  }>({
    template: undefined,
    loading: true,
  });

  const list = useMemo(() => {
    return [
      {
        oid: gitRef,
        commit: {
          message: gitRef,
        },
      },
      ...commits,
    ];
  }, [gitRef, commits]);

  const init = async () => {
    try {
      setState((r) => ({ ...r, template: undefined, loading: true }));

      const data = await getTemplate(projectId, commit, filepath);

      setState((r) => ({ ...r, template: templateYjsFromTemplate(data) }));
    } catch (error) {
      Toast.error(error?.message);
      setState((r) => ({ ...r, loading: false }));
    } finally {
      setState((r) => ({ ...r, loading: false }));
    }
  };

  useEffect(() => {
    init();
  }, [commit]);

  const id = Object.entries(store.tree).find((i) => i[1] === filepath)?.[0];
  const file = id ? store.files[id] : undefined;
  const template = isTemplate(file) ? file : undefined;

  if (!template) return null;

  return (
    <Box height="80vh" display="flex" width={1}>
      <Box flex={1} display="flex" flexDirection="column">
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ fontSize: 20, fontWeight: 'bold' }}>{t('compare.origin')}</Box>

          <TextField
            sx={{ width: '100px' }}
            select
            label={t('compare.select')}
            value={commit}
            onChange={(e) => {
              setCommit(e.target.value);
            }}>
            {list.map((item) => (
              <MenuItem key={item.oid} value={item.oid}>
                {item.commit?.message}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {state.loading ? (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <CircularProgress size={20} />
          </Box>
        ) : !state.template ? (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
              <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
              <Typography sx={{ color: (theme) => theme.palette.action.disabled }}>{t('compare.empty')}</Typography>
            </Box>
          </Box>
        ) : (
          <>
            <TemplateFormView projectId={projectId} gitRef={gitRef} value={state.template} disabled />
            <SettingView projectId={projectId} gitRef={gitRef} template={state.template} disabled />
          </>
        )}
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

      <Box flex={1} display="flex" flexDirection="column">
        <Box sx={{ fontSize: 20, fontWeight: 'bold', mb: 2 }}>{t('compare.current')}</Box>

        {state.loading ? (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <CircularProgress size={20} />
          </Box>
        ) : (
          <>
            <TemplateFormView projectId={projectId} gitRef={gitRef} value={template} />
            <SettingView projectId={projectId} gitRef={gitRef} template={template} />
          </>
        )}
      </Box>
    </Box>
  );
}

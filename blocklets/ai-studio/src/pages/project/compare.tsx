import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, CircularProgress, Divider, MenuItem, Select, Stack, Typography, typographyClasses } from '@mui/material';
import { useRequest } from 'ahooks';
import { useEffect, useMemo, useState } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import TemplateFormView from '../../components/template-form';
import { getLogs } from '../../libs/log';
import { getTemplate } from '../../libs/template';
import { getFileIdFromPath } from '../../utils/path';
import Branch from './icons/branch';
import Empty from './icons/empty';
import History from './icons/history';
import SettingView from './setting-view';
import Dataset from './setting-view/dataset';
import Model from './setting-view/model';
import Next from './setting-view/next';
import Parameters from './setting-view/parameters';
import Settings from './setting-view/settings';
import { defaultBranch, useProjectState } from './state';
import { templateYjsFromTemplate, useProjectStore } from './yjs-state';

export default function Compare({
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
    state: { project, branches },
  } = useProjectState(projectId, gitRef);

  const { getTemplateById } = useProjectStore(projectId, gitRef);

  const simpleMode = project?.gitType === 'simple';

  const [branch, setBranch] = useState(gitRef);
  const [commit, setCommit] = useState(gitRef);
  const [state, setState] = useState<{ loading: boolean; template?: TemplateYjs }>({ loading: true });

  const { data } = useRequest(() => getLogs({ projectId, ref: simpleMode ? defaultBranch : gitRef }), {
    refreshDeps: [projectId, gitRef, simpleMode],
  });

  const list = useMemo(() => {
    const commits = data?.commits || [];
    return [{ oid: gitRef, commit: { message: gitRef } }, ...commits];
  }, [gitRef, data]);

  const templateId = getFileIdFromPath(filepath);
  const template = templateId ? getTemplateById(templateId) : undefined;

  const init = async (hash: string) => {
    try {
      setState((r) => ({ ...r, template: undefined, loading: true }));

      const data = await getTemplate(projectId, hash, templateId || '');

      setState((r) => ({ ...r, template: templateYjsFromTemplate(data) }));
    } catch (error) {
      setState((r) => ({ ...r, template: undefined, loading: false }));
    } finally {
      setState((r) => ({ ...r, loading: false }));
    }
  };

  useEffect(() => {
    init(gitRef);
  }, []);

  const renderSelect = () => {
    return (
      <Box display="flex" gap={1}>
        {!simpleMode && (
          <Select
            startAdornment={<Branch sx={{ mr: 1, fontSize: 16 }} />}
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setCommit('');
              init(e.target.value);
            }}>
            {branches.map((branch) => (
              <MenuItem key={branch} value={branch}>
                {branch}
              </MenuItem>
            ))}
          </Select>
        )}

        <Select
          sx={{ width: 150 }}
          value={commit}
          startAdornment={<History sx={{ mr: 1, fontSize: 16 }} />}
          onChange={(e) => {
            setCommit(e.target.value);
            init(e.target.value);
          }}>
          {list.map((item) => (
            <MenuItem key={item.oid} value={item.oid}>
              {item.commit?.message}
            </MenuItem>
          ))}
        </Select>
      </Box>
    );
  };

  if (state.loading) {
    return (
      <Box height="80vh" display="flex" width={1}>
        <Box flex={1} display="flex" alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
        </Box>
      </Box>
    );
  }

  const empty = (
    <Box flex={1} display="flex" alignItems="center" justifyContent="center">
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
        <Typography sx={{ color: (theme) => theme.palette.action.disabled }}>{t('compare.empty')}</Typography>
      </Box>
    </Box>
  );

  if (!state.template || !template) {
    return (
      <Stack height="80vh" width={1}>
        <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
          <Box flex={1} display="flex" flexDirection="column">
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ fontSize: 20, fontWeight: 'bold' }}>{t('compare.origin')}</Box>

              {renderSelect()}
            </Box>

            {state.template ? (
              <>
                <TemplateFormView
                  projectId={projectId}
                  gitRef={gitRef}
                  value={state.template}
                  compareValue={template}
                  disabled
                />
                <SettingView
                  projectId={projectId}
                  gitRef={gitRef}
                  template={state.template}
                  compareValue={template}
                  disabled
                />
              </>
            ) : (
              empty
            )}
          </Box>

          <Box flex={1} display="flex" flexDirection="column">
            <Box sx={{ fontSize: 20, fontWeight: 'bold', mb: 2 }}>{t('compare.current')}</Box>

            {template ? (
              <>
                <TemplateFormView
                  projectId={projectId}
                  gitRef={gitRef}
                  value={template}
                  compareValue={state.template}
                />
                <SettingView projectId={projectId} gitRef={gitRef} template={template} compareValue={state.template} />
              </>
            ) : (
              empty
            )}
          </Box>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack height="80vh" display="flex" width={1}>
      <Stack
        direction="row"
        sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar, bgcolor: 'background.paper' }}
        divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ fontSize: 20, fontWeight: 'bold' }}>{t('compare.origin')}</Box>

            {renderSelect()}
          </Box>
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <Box sx={{ mb: 2, fontSize: 20, fontWeight: 'bold' }}>{t('compare.current')}</Box>
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          {state.template && (
            <TemplateFormView
              projectId={projectId}
              gitRef={gitRef}
              value={state.template}
              compareValue={template}
              disabled
            />
          )}
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <TemplateFormView projectId={projectId} gitRef={gitRef} value={template} compareValue={state.template} />
        </Box>
      </Stack>

      <Stack
        sx={{
          '>.MuiStack-root > div': { pb: 4 },
          [`.${typographyClasses.subtitle1}`]: { mb: 1 },
        }}>
        <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
          <Box flex={1} display="flex" flexDirection="column">
            {state.template && <Parameters template={state.template} compareValue={template} readOnly />}
          </Box>

          <Box flex={1} display="flex" flexDirection="column">
            <Parameters template={template} compareValue={state.template} />
          </Box>
        </Stack>

        <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
          <Box flex={1} display="flex" flexDirection="column">
            {state.template && (
              <Settings
                projectId={projectId}
                gitRef={gitRef}
                template={state.template}
                compareValue={template}
                readOnly
              />
            )}
          </Box>

          <Box flex={1} display="flex" flexDirection="column">
            <Settings projectId={projectId} gitRef={gitRef} template={template} compareValue={state.template} />
          </Box>
        </Stack>

        <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
          <Box flex={1} display="flex" flexDirection="column">
            {state.template && (
              <Model projectId={projectId} gitRef={gitRef} template={state.template} compareValue={template} readOnly />
            )}
          </Box>

          <Box flex={1} display="flex" flexDirection="column">
            <Model projectId={projectId} gitRef={gitRef} template={template} compareValue={state.template} />
          </Box>
        </Stack>

        <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
          <Box flex={1} display="flex" flexDirection="column">
            {state.template && <Dataset template={state.template} compareValue={template} readOnly />}
          </Box>

          <Box flex={1} display="flex" flexDirection="column">
            <Dataset template={template} compareValue={state.template} />
          </Box>
        </Stack>

        {(state?.template?.type !== 'image' || template.type !== 'image') && (
          <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
            <Box flex={1} display="flex" flexDirection="column">
              {state.template && state.template.type !== 'image' && (
                <Next projectId={projectId} gitRef={gitRef} template={template} compareValue={template} readOnly />
              )}
            </Box>

            <Box flex={1} display="flex" flexDirection="column">
              {template.type !== 'image' && (
                <Next projectId={projectId} gitRef={gitRef} template={template} compareValue={state.template} />
              )}
            </Box>
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}

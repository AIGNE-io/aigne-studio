import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  fileToYjs,
  isApiAssistant,
  isFunctionAssistant,
  isImageAssistant,
  isPromptAssistant,
} from '@blocklet/ai-runtime/types';
import { Box, CircularProgress, Divider, MenuItem, Select, Stack, Typography, styled } from '@mui/material';
import { useRequest } from 'ahooks';
import { useEffect, useMemo, useState } from 'react';
import api from 'src/libs/api';
import { joinURL } from 'ufo';

import ApiAssistantEditor from '../../../components/file-editor/api-assistant';
import BasicInfoForm from '../../../components/file-editor/basic-info-form';
import FunctionAssistantEditor from '../../../components/file-editor/function-file';
import ImageAssistantEditor from '../../../components/file-editor/image-file';
import OutputSettings from '../../../components/file-editor/output-settings';
import ParametersTable from '../../../components/file-editor/parameters-table';
import PromptAssistantEditor from '../../../components/file-editor/prompt-file';
import { getLogs } from '../../../libs/log';
import { getFileIdFromPath } from '../../../utils/path';
import Branch from '../icons/branch';
import Empty from '../icons/empty';
import History from '../icons/history';
import { defaultBranch, useProjectState } from '../state';
import { useProjectStore } from '../yjs-state';
import CompareApiAssistant from './api-assistant';
import CompareFunctionAssistant from './function-file';
import CompareImageAssistant from './image-file';
import ComparePromptAssistant from './prompt-file';

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
  const { state: assistantState } = useProjectState(projectId, gitRef);
  const { project, branches } = assistantState;
  const simpleMode = project?.gitType === 'simple';

  const { getFileById } = useProjectStore(projectId, gitRef);

  const [branch, setBranch] = useState(gitRef);
  const [commit, setCommit] = useState(gitRef);
  const [state, setState] = useState<{ loading: boolean; template?: AssistantYjs }>({ loading: true });

  const { data } = useRequest(() => getLogs({ projectId, ref: simpleMode ? defaultBranch : gitRef }));

  const list = useMemo(() => {
    return [{ oid: gitRef, commit: { message: gitRef } }, ...(data?.commits || [])];
  }, [gitRef, data]);

  const templateId = getFileIdFromPath(filepath);
  const template = templateId ? getFileById(templateId) : undefined;

  const init = async (hash: string) => {
    try {
      setState((r) => ({ ...r, template: undefined, loading: true }));
      const data = await api.get(joinURL('/api/projects', projectId, 'refs', hash, 'assistants', templateId || ''), {
        params: { working: false },
      });
      setState((r) => ({ ...r, template: fileToYjs(data?.data as any) as AssistantYjs }));
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

  const renderAllAssistant = (file: AssistantYjs) => {
    if (isPromptAssistant(file)) {
      return <PromptAssistantEditor projectId={projectId} gitRef={gitRef} value={file} disabled />;
    }

    if (isImageAssistant(file)) {
      return <ImageAssistantEditor projectId={projectId} gitRef={gitRef} value={file} disabled />;
    }

    if (isApiAssistant(file)) {
      return <ApiAssistantEditor projectId={projectId} gitRef={gitRef} value={file} disabled />;
    }

    if (isFunctionAssistant(file)) {
      return <FunctionAssistantEditor projectId={projectId} gitRef={gitRef} value={file} disabled />;
    }

    return null;
  };

  const renderPromptAssistant = (file: AssistantYjs) => {
    if (file && template) {
      if (isPromptAssistant(file) && isPromptAssistant(template)) {
        return (
          <ComparePromptAssistant
            projectId={projectId}
            gitRef={gitRef}
            remoteAssistant={file}
            localeAssistant={template}
          />
        );
      }

      if (isImageAssistant(file) && isImageAssistant(template)) {
        return (
          <CompareImageAssistant
            projectId={projectId}
            gitRef={gitRef}
            remoteAssistant={file}
            localeAssistant={template}
          />
        );
      }

      if (isApiAssistant(file) && isApiAssistant(template)) {
        return (
          <CompareApiAssistant
            projectId={projectId}
            gitRef={gitRef}
            remoteAssistant={file}
            localeAssistant={template}
          />
        );
      }

      if (isFunctionAssistant(file) && isFunctionAssistant(template)) {
        return (
          <CompareFunctionAssistant
            projectId={projectId}
            gitRef={gitRef}
            remoteAssistant={file}
            localeAssistant={template}
          />
        );
      }
    }

    return null;
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

            {state.template ? <>{renderAllAssistant(state.template)}</> : empty}
          </Box>

          <Box flex={1} display="flex" flexDirection="column">
            <Box sx={{ fontSize: 20, fontWeight: 'bold', mb: 2 }}>{t('compare.current')}</Box>

            {template ? <>{renderAllAssistant(template)}</> : empty}
          </Box>
        </Stack>
      </Stack>
    );
  }

  return (
    <Container height="80vh" display="flex" width={1}>
      <Stack
        direction="row"
        sx={{ position: 'sticky', top: 0, zIndex: (theme) => theme.zIndex.appBar, bgcolor: 'background.paper' }}
        divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ fontSize: 20, fontWeight: 'bold' }}>{t('compare.origin')}</Box>

            {renderSelect()}
          </Box>
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <Box sx={{ fontSize: 20, fontWeight: 'bold' }}>{t('compare.current')}</Box>
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          {state.template && <BasicInfoForm projectId={projectId} gitRef={gitRef} value={state.template} disabled />}
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <BasicInfoForm
            projectId={projectId}
            gitRef={gitRef}
            value={template}
            compareValue={state.template}
            disabled
          />
        </Box>
      </Stack>

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          {state.template && (
            <ParametersTable value={state.template} readOnly compareValue={template} isRemoteCompare />
          )}
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <ParametersTable value={template} readOnly compareValue={state.template} />
        </Box>
      </Stack>

      {renderPromptAssistant(state.template)}

      <Stack direction="row" divider={<Divider orientation="vertical" flexItem sx={{ mx: 2 }} />}>
        <Box flex={1} display="flex" flexDirection="column">
          {state.template && <OutputSettings value={state.template} readOnly />}
        </Box>

        <Box flex={1} display="flex" flexDirection="column">
          <OutputSettings value={template} readOnly />
        </Box>
      </Stack>
    </Container>
  );
}

const Container = styled(Stack)`
  > .MuiStack-root {
    > div {
      margin-bottom: 24px;
    }

    &:last-child {
      & > div {
        margin: 0;
      }
    }
  }
`;

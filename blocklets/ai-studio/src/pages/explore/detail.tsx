import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { getAgentByPublishId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Icon } from '@iconify-icon/react';
import ChevronLeft from '@iconify-icons/tabler/chevron-left';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Button, CircularProgress, IconButton, Stack, Tab, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Deployment, getDeployment } from '../../libs/deployment';

export default function CategoryDetail() {
  const navigate = useNavigate();
  const { deploymentId } = useParams();
  if (!deploymentId) throw new Error('Missing required param `publishId`');

  const { data, loading } = useRequest(() => getDeployment({ id: deploymentId }), {
    onError: (error) => {
      Toast.error((error as any)?.response?.data?.message || error?.message);
    },
  });

  if (loading) {
    return (
      <Stack p={2.5} height={1} overflow="hidden" gap={2.5}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack p={2.5} height={1} overflow="hidden" gap={2.5}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <IconButton onClick={() => navigate(-1)}>
          <Box component={Icon} icon={ChevronLeft} />
        </IconButton>
      </Box>

      <Agent data={data!} />
    </Stack>
  );
}

function Agent({ data }: { data: Deployment }) {
  const [value, setValue] = useState('1');
  const handleChange = (_event: any, newValue: string) => setValue(newValue);
  const { getFileById } = useProjectStore(data.projectId, data.projectRef, true);
  const { t } = useLocaleContext();

  return (
    <>
      <Box display="flex" alignItems="center" justifyContent="space-between" height={64}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {getFileById(data.agentId)?.name}
        </Typography>

        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => {
            window.open('https://store.blocklet.dev/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB', '_blank');
          }}>
          {t('makeOwnVersion')}
        </Button>
      </Box>

      <Box flex={1}>
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList onChange={handleChange}>
              <Tab label="Readme" value="1" />
              <Tab label="Run" value="2" />
            </TabList>
          </Box>

          <TabPanel value="1">
            <Box>Readme</Box>
          </TabPanel>

          <TabPanel value="2">
            <PreviewPage />
          </TabPanel>
        </TabContext>
      </Box>
    </>
  );
}

function PreviewPage() {
  const { deploymentId } = useParams();
  if (!deploymentId) throw new Error('Missing required param `publishId`');

  const { data, loading, error } = useRequest(() => getAgentByPublishId({ publishId: deploymentId, working: true }), {
    onError: (error) => {
      Toast.error((error as any)?.response?.data?.message || error?.message);
    },
  });

  if (loading) {
    return (
      <Box textAlign="center" my={10}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (data?.identity?.aid) {
    return <AgentView aid={data?.identity?.aid} working />;
  }

  return <Box component={Result} status={error ? 403 : 404} sx={{ bgcolor: 'transparent', my: 10 }} />;
}

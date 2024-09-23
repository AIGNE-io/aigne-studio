import { getAssetUrl } from '@app/libs/asset';
import { getProjectIconUrl } from '@app/libs/project';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Icon } from '@iconify-icon/react';
import ChevronLeft from '@iconify-icons/tabler/chevron-left';
import PlayIcon from '@iconify-icons/tabler/player-play-filled';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Button, CircularProgress, Divider, Link, Stack, Tab, Typography } from '@mui/material';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { withQuery } from 'ufo';

import { Deployment, getDeployment } from '../../libs/deployment';
import { MakeYoursButton, ShareButton } from './button';

export default function CategoryDetail() {
  const { deploymentId } = useParams();
  if (!deploymentId) throw new Error('Missing required param `deploymentId`');

  const { data, loading } = useRequest(() => getDeployment({ id: deploymentId }), {
    onError: (error) => {
      Toast.error((error as any)?.response?.data?.message || error?.message);
    },
  });

  if (loading) {
    return (
      <Stack p={2.5} width={1} height={1} overflow="hidden" gap={2.5} className="center">
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack height={1} overflow="hidden" gap={1.5}>
      <Agent deployment={data?.deployment!} />
    </Stack>
  );
}

function Agent({ deployment }: { deployment: Deployment }) {
  const [value, setValue] = useState('1');
  const handleChange = (_event: any, newValue: string) => setValue(newValue);
  const navigate = useNavigate();
  const { t } = useLocaleContext();

  return (
    <Stack flex={1}>
      <TabContext value={value}>
        <Box sx={{ borderBottom: 1, borderColor: '#EFF1F5', display: 'flex', alignItems: 'center', px: 3 }}>
          <Box onClick={() => navigate(-1)} sx={{ cursor: 'pointer', width: 20, height: 20 }} className="center">
            <Box component={Icon} icon={ChevronLeft} sx={{ width: 20, height: 20, fontSize: 20, color: '#9CA3AF' }} />
          </Box>

          <TabList
            onChange={handleChange}
            sx={{
              '.MuiTab-root': {
                color: '#9CA3AF',
              },

              '& .MuiTabs-indicator': {
                backgroundColor: '#303030',
                height: '2px',
              },
              '& .Mui-selected': {
                color: '#303030 !important',
              },
            }}>
            <Tab label={t('readme')} value="1" />
            <Tab label={t('run')} value="2" />
          </TabList>
        </Box>

        <TabPanel value="1" sx={{ flex: 1, overflow: 'overlay' }}>
          <ReadmePage deployment={deployment} onRun={() => setValue('2')} />
        </TabPanel>

        <TabPanel value="2" sx={{ flex: 1, overflow: 'overlay', position: 'relative' }}>
          <PreviewPage deployment={deployment} />
        </TabPanel>
      </TabContext>
    </Stack>
  );
}

function ReadmePage({ deployment, onRun }: { deployment: Deployment; onRun: () => void }) {
  const { projectSetting } = useProjectStore(deployment.projectId, deployment.projectRef);
  const { t } = useLocaleContext();

  const banner = projectSetting?.banner
    ? getAssetUrl({
        projectId: deployment.projectId,
        projectRef: deployment.projectRef,
        filename: projectSetting?.banner,
      })
    : getProjectIconUrl(deployment.projectId, { updatedAt: projectSetting.updatedAt });

  return (
    <Stack gap={3}>
      <Box width={1} pb="20%" position="relative">
        {banner ? (
          <Box
            component="img"
            src={withQuery(banner, { imageFilter: 'resize', w: 500 })}
            sx={{
              position: 'absolute',
              inset: 0,
              cursor: 'pointer',
              objectFit: 'cover',
              width: 1,
              height: 1,
            }}
          />
        ) : (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              cursor: 'pointer',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              backgroundSize: 'cover',
            }}
          />
        )}
      </Box>

      <Stack gap={2}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: '32px', color: '#030712' }} gutterBottom>
            {projectSetting.name}
          </Typography>

          <Typography sx={{ fontSize: 16, fontWeight: 400, lineHeight: '24px', color: '#757575' }}>
            {projectSetting.description}
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="stretch">
          <Button variant="contained" onClick={onRun} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component={Icon} icon={PlayIcon} sx={{ width: 14, height: 14, fontSize: 14, color: '#fff' }} />
            {t('run')}
          </Button>

          <MakeYoursButton deployment={deployment} />

          <ShareButton deployment={deployment} />
        </Box>

        {deployment.productHuntUrl && deployment.productHuntBannerUrl && (
          <Box>
            <Box component={Link} href={deployment.productHuntUrl!} target="_blank">
              <Box component="img" src={deployment.productHuntBannerUrl} />
            </Box>
          </Box>
        )}
      </Stack>

      <Divider sx={{ borderColor: '#EFF1F5' }} />

      <Stack>
        <Typography>{t('readme')}</Typography>
      </Stack>
    </Stack>
  );
}

function PreviewPage({ deployment }: { deployment: Deployment }) {
  const { deploymentId } = useParams();
  if (!deploymentId) throw new Error('Missing required param `deploymentId`');

  const { data, loading, error } = useRequest(() => getAgentByDeploymentId({ deploymentId, working: true }), {
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
    return (
      <>
        <Box display="flex" gap={1} alignItems="stretch" sx={{ position: 'absolute', top: 10, right: 10 }}>
          <MakeYoursButton deployment={deployment} />
          <ShareButton deployment={deployment} />
        </Box>

        <AgentView aid={data?.identity?.aid} working />
      </>
    );
  }

  return <Box component={Result} status={error ? 403 : 404} sx={{ bgcolor: 'transparent', my: 10 }} />;
}

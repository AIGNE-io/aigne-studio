import MdViewer from '@app/components/md-viewer';
import { getErrorMessage } from '@app/libs/api';
import { getAssetUrl } from '@app/libs/asset';
import { getProjectIconUrl } from '@app/libs/project';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { getAgentByDeploymentId } from '@blocklet/aigne-sdk/api/agent';
import AgentView from '@blocklet/aigne-sdk/components/AgentView';
import { Icon } from '@iconify-icon/react';
import ChevronLeft from '@iconify-icons/tabler/chevron-left';
import PlayIcon from '@iconify-icons/tabler/player-play-filled';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Link,
  Stack,
  Tab,
  Theme,
  ThemeProvider,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { withQuery } from 'ufo';

import { Deployment, getDeployment } from '../../libs/deployment';
import { MakeYoursButton, ShareButton } from './button';
import { useCategories } from './state';

export default function CategoryDetail() {
  const { deploymentId } = useParams();
  if (!deploymentId) throw new Error('Missing required param `deploymentId`');

  const { data, loading, error } = useRequest(() => getDeployment({ id: deploymentId }), {
    onError: (error) => {
      Toast.error(getErrorMessage(error));
    },
  });

  if (loading) {
    return (
      <Stack p={2.5} width={1} height={1} overflow="hidden" gap={2.5} className="center">
        <CircularProgress size={24} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Box
        component={Result}
        status={(error as any)?.response?.status || 500}
        description={error?.message}
        sx={{ bgcolor: 'transparent', my: 10 }}
      />
    );
  }

  return (
    <Stack height={1} overflow="hidden" gap={1.5}>
      <Agent deployment={data?.deployment!} project={data?.project!} />
    </Stack>
  );
}

function Agent({ deployment, project }: { deployment: Deployment; project: ProjectSettings }) {
  const { categories } = useCategories();
  const { categorySlug } = useParams();

  const category = categories.find((x) => x.slug === categorySlug);

  const [value, setValue] = useState('1');
  const handleChange = (_event: any, newValue: string) => setValue(newValue);
  const navigate = useNavigate();
  const { t } = useLocaleContext();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <Stack flex={1} height={0}>
      <TabContext value={value}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: '#EFF1F5',
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 1.5 : 3,
            gap: 2,
          }}>
          <Stack
            direction="row"
            gap={1}
            onClick={() => navigate(`/explore/${categorySlug}`)}
            sx={{ cursor: 'pointer', mr: 2 }}
            className="center">
            <Box component={Icon} icon={ChevronLeft} sx={{ width: 20, height: 20, fontSize: 20, color: '#9CA3AF' }} />
            <Box sx={{ color: '#9CA3AF' }}>{category?.name}</Box>
          </Stack>

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

        <TabPanel value="1" sx={{ flex: 1, overflow: 'overlay', position: 'relative' }}>
          <ReadmePage deployment={deployment} project={project} onRun={() => setValue('2')} />
        </TabPanel>

        <TabPanel value="2" sx={{ p: 0, flex: 1, overflow: 'overlay', position: 'relative' }}>
          <PreviewPage deployment={deployment} project={project} />
        </TabPanel>
      </TabContext>
    </Stack>
  );
}

function ReadmePage({
  deployment,
  project,
  onRun,
}: {
  deployment: Deployment;
  onRun: () => void;
  project: ProjectSettings;
}) {
  const { t } = useLocaleContext();

  const banner = project?.banner
    ? getAssetUrl({
        projectId: deployment.projectId,
        projectRef: deployment.projectRef,
        filename: project.banner,
      })
    : getProjectIconUrl(deployment.projectId, { updatedAt: project.updatedAt });

  return (
    <Stack gap={3}>
      <Box width={1} pb={{ xs: '50%', md: '30%' }} position="relative" sx={{ borderRadius: 1 }}>
        {banner ? (
          <Box
            component="img"
            src={withQuery(banner, { imageFilter: 'resize', w: 1200 })}
            sx={{
              position: 'absolute',
              inset: 0,
              cursor: 'pointer',
              objectFit: 'cover',
              width: 1,
              height: 1,
              borderRadius: 1,
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
              borderRadius: 1,
            }}
          />
        )}
      </Box>

      <Stack gap={2}>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: '32px', color: '#030712' }} gutterBottom>
            {project.name}
          </Typography>

          <Typography sx={{ fontSize: 16, fontWeight: 400, lineHeight: '24px', color: '#757575' }}>
            {project.description}
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="stretch">
          <Button variant="contained" onClick={onRun} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box component={Icon} icon={PlayIcon} sx={{ width: 14, height: 14, fontSize: 14, color: '#fff' }} />
            {t('run')}
          </Button>

          <MakeYoursButton deployment={deployment} />

          <ShareButton deployment={deployment} project={project} />
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

      <Stack>{project.readme && <MdViewer content={project.readme} />}</Stack>
    </Stack>
  );
}

function PreviewPage({ deployment, project }: { deployment: Deployment; project: ProjectSettings }) {
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
      <Box sx={{ maxWidth: 900, width: 1, mx: 'auto' }}>
        <Stack direction="row" justifyContent="flex-end" gap={1} px={3} my={2}>
          <MakeYoursButton deployment={deployment} variant="contained" />
          <ShareButton deployment={deployment} project={project} />
        </Stack>

        <ThemeProvider theme={agentViewTheme}>
          <AgentView aid={data?.identity?.aid} working />
        </ThemeProvider>
      </Box>
    );
  }

  return <Box component={Result} status={error ? 403 : 404} sx={{ bgcolor: 'transparent', my: 10 }} />;
}

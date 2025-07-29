import MdViewer from '@app/components/md-viewer';
import { getErrorMessage } from '@app/libs/api';
import { User, getProjectIconUrl } from '@app/libs/project';
import { useTabFromQuery } from '@app/utils/use-tab-from-query';
import useBrowser from '@arcblock/react-hooks/lib/useBrowser';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ChevronLeft from '@iconify-icons/tabler/chevron-left';
import PlayIcon from '@iconify-icons/tabler/play';
import PlayFilledIcon from '@iconify-icons/tabler/player-play-filled';
import UserIcon from '@iconify-icons/tabler/user';
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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useNavigate, useParams } from 'react-router-dom';
import { withQuery } from 'ufo';

import Avatar from '../../components/avatar';
import { Deployment, ProjectStatsItem, getDeployment } from '../../libs/deployment';
import { MakeYoursButton, ShareButton, useShareUrl } from './button';

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
      <Stack
        className="center"
        sx={{
          p: 2.5,
          width: 1,
          height: 1,
          overflow: "hidden",
          gap: 2.5
        }}>
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
    <Stack
      sx={{
        height: 1,
        overflow: "hidden",
        gap: 1.5
      }}>
      <Agent
        deployment={data?.deployment!}
        project={data?.project!}
        stats={data?.stats!}
        createdByInfo={data?.createdByInfo!}
      />
    </Stack>
  );
}

function Agent({
  deployment,
  project,
  stats,
  createdByInfo,
}: {
  deployment: Deployment;
  project: ProjectSettings;
  stats: ProjectStatsItem;
  createdByInfo: User;
}) {
  const { categorySlug } = useParams();

  const [tab, setTab] = useTabFromQuery(['readme', 'run']);

  const navigate = useNavigate();
  const { t } = useLocaleContext();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const browser = useBrowser();
  const isArcSphere = browser?.arcSphere ?? false;

  return (
    <Stack
      sx={{
        flex: 1,
        height: 0
      }}>
      <TabContext value={tab}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: '#EFF1F5',
            display: 'flex',
            alignItems: 'center',
            px: isMobile ? 1.5 : 3,
            gap: 2,
          }}>
          {!isArcSphere && (
            <Stack
              direction="row"
              onClick={() => navigate(`/explore/${categorySlug}`)}
              className="center"
              sx={{
                gap: 1,
                cursor: 'pointer',
                mr: 0
              }}>
              <Box component={Icon} icon={ChevronLeft} sx={{ width: 20, height: 20, fontSize: 20, color: '#9CA3AF' }} />
            </Stack>
          )}

          <TabList
            onChange={(_, tab) => setTab(tab)}
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
            <Tab label={t('readme')} value="readme" data-testid="readme-tab" />
          </TabList>
        </Box>

        <TabPanel value="readme" sx={{ flex: 1, overflow: 'overlay', position: 'relative' }}>
          <ReadmePage deployment={deployment} project={project} stats={stats} createdByInfo={createdByInfo} />
        </TabPanel>
      </TabContext>
    </Stack>
  );
}

function ReadmePage({
  deployment,
  project,
  stats,
  createdByInfo,
}: {
  deployment: Deployment;
  project: ProjectSettings;
  stats: ProjectStatsItem;
  createdByInfo: User;
}) {
  const { t } = useLocaleContext();
  const { shareUrl } = useShareUrl({ deployment });
  const icon = getProjectIconUrl(deployment.projectId, { updatedAt: project.updatedAt });
  const totalUsers = stats?.totalUsers || 0;
  const totalRuns = stats?.totalRuns || 0;

  return (
    <Stack data-testid="readme-page" sx={{
      gap: 3
    }}>
      <Stack direction="row" sx={{
        gap: 2
      }}>
        <Box
          component="img"
          alt=""
          src={withQuery(icon, { imageFilter: 'resize', w: 300 })}
          sx={{
            width: { xs: 64, md: 144 },
            height: { xs: 64, md: 144 },
            borderRadius: 1,
            objectFit: 'cover',
          }}
        />

        <Stack sx={{
          gap: 2
        }}>
          <Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: '32px', color: '#030712' }} gutterBottom>
              {project.name}
            </Typography>

            <Typography sx={{ fontSize: 16, fontWeight: 400, lineHeight: '24px', color: '#757575' }}>
              {project.description}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: 12 }}>
              <Avatar
                did={createdByInfo?.did || deployment.createdBy}
                src={createdByInfo?.avatar}
                size={20}
                shape="circle"
                variant="circle"
                sx={{
                  width: '100%',
                  height: '100%',
                }}
              />
              <span>{createdByInfo?.fullName}</span>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, fontSize: 12, color: 'text.secondary' }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                title={totalUsers ? `This project has been used by ${totalUsers} users` : ''}>
                <Box component={Icon} icon={UserIcon} sx={{ fontSize: 14 }} />
                <span>{totalUsers}</span>
              </Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                title={totalRuns ? `This project has been executed ${totalRuns} times in total` : ''}>
                <Box component={Icon} icon={PlayIcon} sx={{ fontSize: 13 }} />
                <span>{totalRuns}</span>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "stretch"
            }}>
            <Button
              variant="contained"
              href={shareUrl}
              target="_blank"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              data-testid="run-button">
              <Box component={Icon} icon={PlayFilledIcon} sx={{ width: 14, height: 14, fontSize: 14, color: '#fff' }} />
              {t('run')}
            </Button>

            <MakeYoursButton project={project} deployment={deployment} data-testid="make-yours-button" />

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
      </Stack>
      <Divider sx={{ borderColor: '#EFF1F5' }} />
      <Stack>{project.readme && <MdViewer content={project.readme} sx={{ img: { maxWidth: '100%' } }} />}</Stack>
    </Stack>
  );
}

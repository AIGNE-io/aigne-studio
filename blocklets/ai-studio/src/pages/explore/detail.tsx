import MdViewer from '@app/components/md-viewer';
import { getErrorMessage } from '@app/libs/api';
import { getAssetUrl } from '@app/libs/asset';
import { getProjectIconUrl } from '@app/libs/project';
import { useTabFromQuery } from '@app/utils/use-tab-from-query';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Result from '@arcblock/ux/lib/Result';
import Toast from '@arcblock/ux/lib/Toast';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
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
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useNavigate, useParams } from 'react-router-dom';
import { withQuery } from 'ufo';

import { Deployment, getDeployment } from '../../libs/deployment';
import { MakeYoursButton, ShareButton, useShareUrl } from './button';
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

  const [tab, setTab] = useTabFromQuery(['readme', 'run']);

  const navigate = useNavigate();
  const { t } = useLocaleContext();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <Stack flex={1} height={0}>
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
          <ReadmePage deployment={deployment} project={project} />
        </TabPanel>
      </TabContext>
    </Stack>
  );
}

function ReadmePage({ deployment, project }: { deployment: Deployment; project: ProjectSettings }) {
  const { t } = useLocaleContext();
  const { openInNewTab } = useShareUrl({ deployment });
  const banner = project?.banner
    ? getAssetUrl({
        projectId: deployment.projectId,
        projectRef: deployment.projectRef,
        filename: project.banner,
      })
    : getProjectIconUrl(deployment.projectId, { updatedAt: project.updatedAt });

  return (
    <Stack gap={3} data-testid="readme-page">
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
          <Button
            variant="contained"
            onClick={() => openInNewTab()}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            data-testid="run-button">
            <Box component={Icon} icon={PlayIcon} sx={{ width: 14, height: 14, fontSize: 14, color: '#fff' }} />
            {t('run')}
          </Button>

          <MakeYoursButton deployment={deployment} data-testid="make-yours-button" />

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

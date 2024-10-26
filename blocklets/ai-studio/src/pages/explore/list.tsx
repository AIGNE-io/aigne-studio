import 'swiper/css';
import 'swiper/css/navigation';

import Avatar from '@app/components/avatar';
import { useSessionContext } from '@app/contexts/session';
import { Category } from '@app/libs/category';
import { Deployment, ProjectStatsItem } from '@app/libs/deployment';
import { User, getProjectIconUrl } from '@app/libs/project';
import Empty from '@app/pages/project/icons/empty';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import PlayIcon from '@iconify-icons/tabler/play';
import UserIcon from '@iconify-icons/tabler/user';
import { Box, CircularProgress, Container, Divider, Stack, Typography } from '@mui/material';
import { useOutletContext, useParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { MobileSidebarHeader } from './layout';
import { useFetchDeployments } from './state';

function CategoryCard({
  deployment,
  project,
  stats,
  createdBy,
}: {
  deployment: Deployment;
  project: ProjectSettings;
  stats: ProjectStatsItem;
  createdBy?: User;
}) {
  const { t } = useLocaleContext();
  const icon = getProjectIconUrl(deployment.projectId, { updatedAt: project.updatedAt });
  const { session } = useSessionContext();
  const totalUsers = stats?.totalUsers || 0;
  const totalRuns = stats?.totalRuns || 0;
  return (
    <Stack
      component="a"
      href={withQuery(joinURL(globalThis.location.origin, window.blocklet.prefix, '/apps', deployment.id), {
        inviter: session.user?.did,
      })}
      sx={{
        borderRadius: 1,
        overflow: 'hidden',
        height: '100%',
        p: 2,
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: `
          0px 0px 1px 1px rgba(3, 7, 18, 0.08),
          0px 1px 2px -1px rgba(3, 7, 18, 0.08),
          0px 2px 4px 0px rgba(3, 7, 18, 0.04)
        `,
      }}>
      <Stack direction="row" gap={{ xs: 1.5, xl: 2 }}>
        <Box
          component="img"
          src={withQuery(icon, { imageFilter: 'resize', w: 300 })}
          sx={{
            width: { xs: 64, xl: 88 },
            height: { xs: 64, xl: 88 },
            borderRadius: 1,
          }}
        />
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Typography
            gutterBottom
            sx={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              color: '#030712',
              fontWeight: 500,
              fontSize: 16,
              lineHeight: '24px',
              mb: 0.5,
            }}>
            {project.name || t('unnamed')}
          </Typography>
          <Typography
            sx={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              textOverflow: 'ellipsis',
              fontSize: '13px',
              lineHeight: '20px',
            }}>
            {project.description}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', fontSize: 12 }}>
          <Avatar
            did={createdBy?.did || deployment.createdBy}
            src={createdBy?.avatar}
            size={20}
            shape="circle"
            variant="circle"
            sx={{
              width: '100%',
              height: '100%',
            }}
          />
          <span>{createdBy?.fullName}</span>
        </Box>
        <Box sx={{ display: 'flex', gap: 3, fontSize: 12, color: 'text.secondary' }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            title={totalUsers ? `This project has been used by ${totalUsers} users` : ''}>
            <Box component={Icon} icon={UserIcon} sx={{ fontSize: 14 }} />
            <span>{totalUsers}</span>
          </Box>
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            title={totalRuns ? `This project has been executed ${totalRuns} times in total` : ''}>
            <Box component={Icon} icon={PlayIcon} sx={{ fontSize: 13 }} />
            <span>{totalRuns}</span>
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}

function CategoryList() {
  const params = useParams();

  const { loadingRef, dataState, currentDeploymentState } = useFetchDeployments(params.categorySlug);
  const { categories } = useOutletContext<{ categories: Category[] }>();
  const deployments = currentDeploymentState?.list || [];
  const { t } = useLocaleContext();

  return (
    <Stack sx={{ height: 1, overflow: 'hidden' }}>
      <MobileSidebarHeader categories={categories} />
      <Box sx={{ flex: 1, overflow: 'auto' }} data-testid="explore-list">
        <Container>
          {deployments.length === 0 && (
            <Stack flex={1} height={500} justifyContent="center" alignItems="center" gap={1}>
              <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
              <Typography color="text.disabled" sx={{ whiteSpace: 'break-spaces', textAlign: 'center' }}>
                {t('deployments.emptyDeployment')}
              </Typography>
            </Stack>
          )}
          <Box component="ul" sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5, p: 0, listStyle: 'none' }}>
            {deployments.map((deployment) => (
              <Box
                key={deployment.id}
                component="li"
                data-testid="explore-card"
                sx={{
                  width: { xs: 1, md: 1 / 2, lg: 1 / 3 },
                  p: 1.5,
                }}>
                <CategoryCard
                  deployment={deployment}
                  project={deployment.project}
                  stats={deployment.stats}
                  createdBy={deployment.createdByInfo}
                />
              </Box>
            ))}
          </Box>

          {(dataState.loadingMore || dataState?.data?.next) && (
            <Box width={1} height={60} className="center" ref={loadingRef}>
              <Box display="flex" justifyContent="center">
                <CircularProgress size={24} />
              </Box>
            </Box>
          )}
        </Container>
      </Box>
    </Stack>
  );
}

export default CategoryList;

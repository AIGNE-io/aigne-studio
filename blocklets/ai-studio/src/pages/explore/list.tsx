import 'swiper/css';
import 'swiper/css/navigation';

import { Category } from '@app/libs/category';
import { Deployment } from '@app/libs/deployment';
import { getProjectIconUrl } from '@app/libs/project';
import Empty from '@app/pages/project/icons/empty';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { Box, CircularProgress, Container, Divider, Stack, Typography } from '@mui/material';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { withQuery } from 'ufo';

import { MobileSidebarHeader } from './layout';
import { useFetchDeployments } from './state';

function CategoryCard({ deployment, project }: { deployment: Deployment; project: ProjectSettings }) {
  const { t } = useLocaleContext();
  const icon = getProjectIconUrl(deployment.projectId, { updatedAt: project.updatedAt });

  return (
    <Stack
      sx={{
        borderRadius: 1,
        overflow: 'hidden',
        height: '100%',
        p: 2,
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
        <Box>xxxu user</Box>
        <Box>2.2K</Box>
      </Box>
    </Stack>
  );
}

function CategoryList() {
  const navigate = useNavigate();
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
                onClick={() => navigate(deployment.id)}
                data-testid="explore-card"
                sx={{
                  width: { xs: 1, md: 1 / 2, lg: 1 / 3 },
                  p: 1.5,
                }}>
                <CategoryCard deployment={deployment} project={deployment.project} />
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {(dataState.loadingMore || dataState?.data?.next) && (
        <Box width={1} height={60} className="center" ref={loadingRef}>
          <Box display="flex" justifyContent="center">
            <CircularProgress size={24} />
          </Box>
        </Box>
      )}
    </Stack>
  );
}

export default CategoryList;

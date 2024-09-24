import 'swiper/css';
import 'swiper/css/navigation';

import { getAssetUrl } from '@app/libs/asset';
import { Category } from '@app/libs/category';
import { getDeploymentsByCategoryId } from '@app/libs/deployment';
import { getProjectIconUrl } from '@app/libs/project';
import Empty from '@app/pages/project/icons/empty';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import CircleArrowLeft from '@iconify-icons/tabler/circle-arrow-left';
import CircleArrowRight from '@iconify-icons/tabler/circle-arrow-right';
import {
  Box,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  Theme,
  Typography,
  useMediaQuery,
} from '@mui/material';
import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { withQuery } from 'ufo';

import { MobileSidebarHeader } from './layout';

const pageSize = 10;
const pcSpacing = 3;
const mobileSpacing = 2;

export function Slide() {
  return (
    <Box
      sx={{
        mb: 2.5,
        height: 300,
        borderRadius: 1,
        position: 'relative',
        border: '1px solid red',
        boxSizing: 'border-box',

        '.swiper': {
          height: 1,
        },
      }}>
      <Box
        loop
        component={Swiper}
        modules={[Navigation]}
        navigation={{
          nextEl: '.swiper-button-next-custom',
          prevEl: '.swiper-button-prev-custom',
        }}
        slidesPerView={1}>
        <SwiperSlide>
          <Box width={1} height={1}>
            Slide 1
          </Box>
        </SwiperSlide>
        <SwiperSlide>
          <Box width={1} height={1}>
            Slide 2
          </Box>
        </SwiperSlide>
        <SwiperSlide>
          <Box width={1} height={1}>
            Slide 3
          </Box>
        </SwiperSlide>
        <SwiperSlide>
          <Box width={1} height={1}>
            Slide 4
          </Box>
        </SwiperSlide>
      </Box>

      <IconButton
        className="swiper-button-prev-custom"
        sx={{
          position: 'absolute',
          top: '50%',
          left: 0,
          transform: 'translateY(-50%)',
          zIndex: 10,
        }}>
        <Box component={Icon} icon={CircleArrowLeft} sx={{ fontSize: 30 }} />
      </IconButton>
      <IconButton
        className="swiper-button-next-custom"
        sx={{
          position: 'absolute',
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          zIndex: 10,
        }}>
        <Box component={Icon} icon={CircleArrowRight} sx={{ fontSize: 30 }} />
      </IconButton>
    </Box>
  );
}

function CategoryCard({ projectId, projectRef }: { projectId: string; projectRef: string }) {
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const { t } = useLocaleContext();

  const banner = projectSetting?.banner
    ? getAssetUrl({ projectId, projectRef, filename: projectSetting?.banner })
    : getProjectIconUrl(projectSetting.id, { updatedAt: projectSetting.updatedAt });

  return (
    <Box
      sx={{
        borderRadius: 1.5,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: `
        0px 0px 1px 1px rgba(3, 7, 18, 0.08),
        0px 1px 2px -1px rgba(3, 7, 18, 0.08),
        0px 2px 4px 0px rgba(3, 7, 18, 0.04)
      `,
      }}>
      <Box width={1} pb="50%" position="relative">
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

      <CardContent sx={{ flexGrow: 1 }}>
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
          {projectSetting?.name || t('unnamed')}
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
          {projectSetting?.description}
        </Typography>
      </CardContent>
    </Box>
  );
}

function CategoryList() {
  const navigate = useNavigate();
  const params = useParams();

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const { loadingRef, dataState } = useFetchDeployments(params.categoryId);
  const { categories } = useOutletContext<{ categories: Category[] }>();
  const deployments = dataState?.data?.list || [];
  const { t } = useLocaleContext();

  const spacing = isMobile ? mobileSpacing : pcSpacing;

  return (
    <Stack sx={{ width: 1, height: 1, overflow: 'hidden' }}>
      <MobileSidebarHeader categories={categories} />

      <Box sx={{ flexGrow: 1, p: spacing, overflow: 'overlay' }}>
        <Grid container spacing={spacing}>
          {deployments.length === 0 && (
            <Stack flex={1} height={500} justifyContent="center" alignItems="center" gap={1}>
              <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
              <Typography color="text.disabled" sx={{ whiteSpace: 'break-spaces', textAlign: 'center' }}>
                {t('deployments.emptyDeployment')}
              </Typography>
            </Stack>
          )}

          {deployments.map((tool) => (
            <Grid item key={tool.id} xs={12} sm={6} md={4} onClick={() => navigate(tool.id)}>
              <CategoryCard projectId={tool.projectId} projectRef={tool.projectRef} />
            </Grid>
          ))}
        </Grid>

        {(dataState.loadingMore || dataState?.data?.next) && (
          <Box width={1} height={60} className="center" ref={loadingRef}>
            <Box display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          </Box>
        )}
      </Box>
    </Stack>
  );
}

export default CategoryList;

const useFetchDeployments = (id?: string) => {
  const dataState = useInfiniteScroll(
    async (
      d: { list: any[]; next: boolean; size: number; page: number } = {
        list: [],
        next: false,
        size: pageSize,
        page: 1,
      }
    ) => {
      if (!id) {
        return { list: [], next: false, size: pageSize, page: 1, total: 0 };
      }

      const { page = 1, size = pageSize } = d || {};
      const { list: items, totalCount: total } = await getDeploymentsByCategoryId({
        categoryId: id,
        page,
        pageSize: size,
      });

      return { list: items || [], next: items.length >= size, size, page: (d?.page || 1) + 1, total };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [id] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState };
};

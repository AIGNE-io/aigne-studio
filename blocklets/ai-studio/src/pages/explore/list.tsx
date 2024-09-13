import 'swiper/css';
import 'swiper/css/navigation';

import { getDeploymentsByCategoryId } from '@app/libs/deployment';
import Empty from '@app/pages/project/icons/empty';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import CircleArrowLeft from '@iconify-icons/tabler/circle-arrow-left';
import CircleArrowRight from '@iconify-icons/tabler/circle-arrow-right';
import { Box, Card, CardContent, CircularProgress, Grid, IconButton, Stack, Typography } from '@mui/material';
import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { withQuery } from 'ufo';

const pageSize = 10;

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
function CategoryCard({
  projectId,
  projectRef,
  agentId,
  banner,
}: {
  projectId: string;
  projectRef: string;
  agentId: string;
  banner?: string;
}) {
  const { getFileById } = useProjectStore(projectId, projectRef, true);
  const agent = getFileById(agentId);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <Box width={1} pb="40%" position="relative">
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

      <CardContent sx={{ flexGrow: 1 }}>
        <Typography gutterBottom variant="h6" component="h2" className="ellipsis">
          {agent?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="ellipsis">
          {agent?.description}
        </Typography>
      </CardContent>
    </Card>
  );
}

function CategoryList() {
  const navigate = useNavigate();
  const params = useParams();

  const { loadingRef, dataState } = useFetchDeployments(params.categoryId);
  const deployments = dataState?.data?.list || [];
  const { t } = useLocaleContext();

  return (
    <Box sx={{ flexGrow: 1, p: 2.5 }}>
      <Grid container spacing={2.5}>
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
            <CategoryCard
              projectId={tool.projectId}
              projectRef={tool.projectRef}
              agentId={tool.agentId}
              banner={tool.banner}
            />
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

      const list = (d?.list?.length || 0) + items.length;
      const next = Boolean(list < total);
      return { list: items || [], next, size, page: (d?.page || 1) + 1, total };
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

import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import { Box, CircularProgress, Stack } from '@mui/material';
import { Suspense, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useParams, useRoutes } from 'react-router-dom';
import { joinURL } from 'ufo';

import ProjectBrand from './project-brand';
import PromptActions from './prompt-actions';
import SegmentedControl from './segmented-control';

export default function ProjectHeader() {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const pathname = useLocation().pathname.toLowerCase();

  const current = useMemo(() => {
    if (pathname.includes(`${projectId}/file`)) {
      return 'prompts';
    }

    if (pathname.includes(`${projectId}/setting`)) {
      return 'settings';
    }

    if (pathname.includes(`${projectId}/knowledge`)) {
      return 'knowledge';
    }

    if (pathname.includes(`${projectId}/variables`)) {
      return 'variables';
    }

    return 'prompts';
  }, [pathname, projectId]);

  return (
    <Stack height={1} overflow="hidden">
      <Box height={64} borderBottom="1px solid #E5E7EB" px={2.5} className="between">
        <Box flex={1}>
          <ProjectBrand />
        </Box>

        <Box flex={1} display="flex" justifyContent="center">
          <SegmentedControl
            value={current}
            options={[
              {
                value: 'prompts',
                label: t('prompts'),
                icon: <Box fontSize={15} component={Icon} icon="tabler:bulb" mr={1} />,
              },
              {
                value: 'knowledge',
                label: t('knowledge.menu'),
                icon: <Box fontSize={15} component={Icon} icon="tabler:book-2" mr={1} />,
              },
              {
                value: 'variables',
                label: t('variable'),
                icon: <Box fontSize={15} component={Icon} icon="tabler:database" mr={1} />,
              },
            ]}
            onChange={(value) => {
              if (value) navigate(joinURL('..', projectId || '', value));
            }}
          />
        </Box>

        <Box flex={1} display="flex" justifyContent="flex-end">
          <ActionRoutes />
        </Box>
      </Box>

      <Box flex={1} height={0} overflow="hidden" bgcolor="background.default">
        <Suspense
          fallback={
            <Box flex={1} className="center" width={1} height={1}>
              <CircularProgress size={30} />
            </Box>
          }>
          <Outlet />
        </Suspense>
      </Box>
    </Stack>
  );
}

function ActionRoutes() {
  const element = useRoutes([
    {
      path: ':projectId?/*',
      element: <Outlet />,
      children: [
        {
          path: 'file',
          children: [
            {
              path: ':ref/*',
              element: <PromptActions />,
            },
            {
              path: '*',
              element: null,
            },
          ],
        },
        {
          path: '*',
          element: null,
        },
      ],
    },
  ]);

  return <Suspense>{element}</Suspense>;
}

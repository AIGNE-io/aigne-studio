import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack } from '@mui/material';
import { Suspense, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useParams, useRoutes } from 'react-router-dom';
import { joinURL } from 'ufo';

import HeaderActions from './header-actions';
import Knowledge from './icons/knowledge';
import Prompts from './icons/prompts';
import Settings from './icons/settings';
import ProjectBrand from './project-brand';
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
              { value: 'prompts', label: t('prompts'), icon: <Prompts sx={{ fontSize: 15, mr: 1 }} /> },
              {
                value: 'settings',
                label: t('setting'),
                icon: <Settings sx={{ fontSize: 15, mr: 1, color: '#4B5563' }} />,
              },
              { value: 'knowledge', label: t('knowledge.menu'), icon: <Knowledge sx={{ fontSize: 15, mr: 1 }} /> },
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
        <Outlet />
      </Box>
    </Stack>
  );
}

function ActionRoutes() {
  const element = useRoutes([
    {
      path: ':projectId?/*',
      element: (
        <Stack direction="row" alignItems="center">
          <Outlet />
        </Stack>
      ),
      children: [
        {
          path: 'file',
          children: [
            {
              path: ':ref/*',
              element: <HeaderActions />,
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

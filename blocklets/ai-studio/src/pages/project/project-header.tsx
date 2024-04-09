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
      return 'setting';
    }

    if (pathname.includes(`${projectId}/knowledge`)) {
      return 'knowledge';
    }

    return 'prompts';
  }, [pathname, projectId]);

  return (
    <Box height={1} overflow="hidden">
      <Box height={64} borderBottom="1px solid #E5E7EB" px={2.5} className="between">
        <Box>
          <ProjectBrand />
        </Box>

        <Box>
          <SegmentedControl
            value={current}
            options={[
              { value: 'prompts', label: t('prompts'), icon: <Prompts sx={{ fontSize: 15, mr: 1 }} /> },
              { value: 'setting', label: t('setting'), icon: <Settings sx={{ fontSize: 15, mr: 1 }} /> },
              { value: 'knowledge', label: t('knowledge.menu'), icon: <Knowledge sx={{ fontSize: 15, mr: 1 }} /> },
            ]}
            onChange={(value) => {
              if (value) navigate(joinURL('/projects', value));
            }}
          />
        </Box>

        <Box>
          <ActionRoutes />
        </Box>
      </Box>

      <Outlet />
    </Box>
  );
}

function ActionRoutes() {
  const element = useRoutes([
    {
      path: ':projectId/*',
      element: (
        <Stack direction="row" alignItems="center">
          <Outlet />
        </Stack>
      ),
      children: [
        {
          path: 'file',
          element: <HeaderActions />,
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

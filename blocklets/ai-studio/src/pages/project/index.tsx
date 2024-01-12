import SubscribeButton from '@app/components/subscribe';
import { Dashboard } from '@blocklet/studio-ui';
import {
  Box,
  GlobalStyles,
  Stack,
  backdropClasses,
  circularProgressClasses,
  paperClasses,
  styled,
} from '@mui/material';
import { ComponentProps, Suspense, lazy, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Navigate, Outlet, Route, Routes, useLocation, useRoutes } from 'react-router-dom';

import ErrorBoundary from '../../components/error/error-boundary';
import Loading from '../../components/loading';
import AddSource from './add-source';
import HeaderActions from './header-actions';
import MainMenus from './main-menus';
import { defaultBranch } from './state';

export default function ProjectRoutes() {
  const errorBoundary = useRef<ErrorBoundary>(null);

  const location = useLocation();
  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  return (
    <DndProvider backend={HTML5Backend}>
      <GlobalStyles
        styles={(theme) => ({
          html: {
            backgroundColor: theme.palette.background.default,
          },
        })}
      />
      <StyledDashboard
        HeaderProps={{
          logo: <LogoRoutes />,
          brandAddon: <BrandRoutes />,
          addons: (exists) => [<SubscribeButton />, <AddonsRoutes />, ...exists],
        }}
        menus={<MenuRoutes />}
        MenusDrawerProps={{ sx: { [`.${backdropClasses.root}`]: { top: 64 } } }}
        sx={{
          bgcolor: 'background.default',

          '> .dashboard-header': {
            border: 'none',
            bgcolor: 'transparent',
          },

          '> .dashboard-body': {
            '> .dashboard-aside': {
              [`.${paperClasses.root}`]: {
                border: 'none',
                bgcolor: 'background.default',
              },
            },
            '> .dashboard-content': {
              bgcolor: 'background.paper',
              borderTopLeftRadius: (theme) => theme.shape.borderRadius * 2,
              borderTopRightRadius: (theme) => theme.shape.borderRadius * 2,
              overflow: 'hidden',
            },
          },
        }}>
        <ErrorBoundary ref={errorBoundary}>
          <Suspense fallback={<Loading fixed />}>
            <Routes>
              <Route index element={<ProjectsPage />} />
              <Route path=":projectId/*">
                <Route index element={<Navigate to="file" replace />} />
                <Route path="prompts/*" element={<Navigate to="../file" replace />} />
                <Route path="home" element={<ProjectsPage />} />
                <Route path="file">
                  <Route index element={<Navigate to={defaultBranch} replace />} />
                  <Route path=":ref/*" element={<ProjectPage />} />
                </Route>
                <Route path="settings">
                  <Route index element={<ProjectSettings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </StyledDashboard>
    </DndProvider>
  );
}

function BrandRoutes() {
  const element = useRoutes([{ path: ':projectId/*', element: <ProjectBrand /> }]);
  return <Suspense>{element}</Suspense>;
}

function LogoRoutes() {
  const element = useRoutes([
    { path: ':projectId/*', element: <ProjectLogo /> },
    { path: '*', element: <Box component="img" src={blocklet?.appLogo} /> },
  ]);
  return <Suspense>{element}</Suspense>;
}

function AddonsRoutes() {
  const element = useRoutes([
    {
      path: ':projectId/*',
      element: (
        <Stack direction="row" alignItems="center">
          <Outlet />
          <AddSource />
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

function MenuRoutes({ ...props }: ComponentProps<typeof MainMenus>) {
  const element = useRoutes([{ path: ':projectId?/*', element: <MainMenus {...props} /> }]);

  return <Suspense>{element}</Suspense>;
}

const ProjectsPage = lazy(() => import('./projects-page'));

const ProjectPage = lazy(() => import('./project-page'));

const ProjectBrand = lazy(() => import('./project-brand'));

const ProjectLogo = lazy(() => import('./project-logo'));

const ProjectSettings = lazy(() => import('./settings'));

const StyledDashboard = styled(Dashboard)`
  .header-container {
    padding-left: ${({ theme }) => theme.spacing(3)};
    padding-right: ${({ theme }) => theme.spacing(3)};

    ${({ theme }) => theme.breakpoints.down('md')} {
      padding-left: ${({ theme }) => theme.spacing(1)};
      padding-right: ${({ theme }) => theme.spacing(1)};

      .header-addons {
        button {
          svg,
          .${circularProgressClasses.root} {
            font-size: 1.25rem !important;
            width: 1.25rem !important;
            height: 1.25rem !important;
          }
        }
      }
    }

    .locales {
      border-radius: ${({ theme }) => theme.shape.borderRadius}px;
      box-shadow: ${({ theme }) => theme.shadows[1]};
      margin-top: ${({ theme }) => theme.spacing(1.5)}px;
    }
  }
`;

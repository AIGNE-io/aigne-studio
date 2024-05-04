import AigneLogo from '@app/components/aigne-logo';
import UploaderProvider from '@app/contexts/uploader';
import currentGitStore from '@app/store/current-git-store';
import { SubscribeButton } from '@blocklet/ai-kit/components';
import { Dashboard } from '@blocklet/studio-ui';
import { GlobalStyles, Stack, backdropClasses, circularProgressClasses, paperClasses, styled } from '@mui/material';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Navigate, Outlet, Route, Routes, useLocation, useRoutes } from 'react-router-dom';
import { joinURL } from 'ufo';

import ErrorBoundary from '../../components/error/error-boundary';
import Loading from '../../components/loading';
import { DatasetsProvider } from '../../contexts/datasets/datasets';
import KnowledgeRoutes from '../knowledge';
import VariablesList from '../variables/list';
import AddSource from './add-source';
import ProjectHeader from './project-header';

export default function ProjectRoutes() {
  const errorBoundary = useRef<ErrorBoundary>(null);
  const location = useLocation();

  useEffect(() => {
    errorBoundary.current?.reset();
  }, [location]);

  return (
    <UploaderProvider>
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
            logo: <AigneLogo />,
            addons: (exists) => [<SubscribeButton />, <AddonsRoutes />, ...exists],
            homeLink: joinURL(blocklet?.prefix || '', 'projects'),
          }}
          MenusDrawerProps={{ sx: { [`.${backdropClasses.root}`]: { top: 64 } } }}
          sx={{
            bgcolor: 'background.default',

            '> .dashboard-header': {
              border: 'none',
              borderBottom: '1px solid #E5E7EB',
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
                overflow: 'hidden',
              },
            },
          }}>
          <ErrorBoundary ref={errorBoundary}>
            <DatasetsProvider>
              <Suspense fallback={<Loading fixed />}>
                <Routes>
                  <Route index element={<ProjectsPage />} />
                  <Route path=":projectId/*" element={<ProjectHeader />}>
                    <Route index element={<Navigate to="file" replace />} />
                    <Route path="prompts/*" element={<Navigate to="../file" replace />} />
                    <Route path="home" element={<ProjectsPage />} />
                    <Route path="file">
                      <Route index element={<Navigate to={currentGitStore.getState().getCurrentBranch()} replace />} />
                      <Route path=":ref/*" element={<ProjectPage />} />
                    </Route>
                    <Route path="settings" element={<ProjectSettings />} />
                    <Route path="knowledge/*" element={<KnowledgeRoutes />} />
                    <Route path="variables">
                      <Route index element={<Navigate to={currentGitStore.getState().getCurrentBranch()} replace />} />
                      <Route path=":ref/*" element={<VariablesList />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </DatasetsProvider>
          </ErrorBoundary>
        </StyledDashboard>
      </DndProvider>
    </UploaderProvider>
  );
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
    },
  ]);
  return <Suspense>{element}</Suspense>;
}

const ProjectsPage = lazy(() => import('./projects-page'));

const ProjectPage = lazy(() => import('./project-page'));

const ProjectSettings = lazy(() => import('./settings'));

const StyledDashboard = styled(Dashboard)`
  .header-container {
    padding-left: ${({ theme }) => theme.spacing(3)};
    padding-right: ${({ theme }) => theme.spacing(3)};

    ${({ theme }) => theme.breakpoints.down('md')} {
      padding-left: ${({ theme }) => theme.spacing(2)};
      padding-right: ${({ theme }) => theme.spacing(2)};

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

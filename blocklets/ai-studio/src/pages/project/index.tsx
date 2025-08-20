import AigneLogo from '@app/components/aigne-logo';
import ErrorBoundary from '@app/components/error/error-boundary';
import UploaderProvider from '@app/contexts/uploader';
import currentGitStore from '@app/store/current-git-store';
import { Dashboard } from '@blocklet/studio-ui';
import { GlobalStyles, backdropClasses, circularProgressClasses, paperClasses, styled } from '@mui/material';
import { Suspense, lazy } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Navigate, Route, Routes } from 'react-router-dom';
import { joinURL } from 'ufo';

import Loading from '../../components/loading';
import { PlanUpgradeButton } from '../../components/multi-tenant-restriction';
import KnowledgeRoutes from '../knowledges';
import VariablesList from '../variables/list';
import LogMessages from './log-message';
import ProjectHeader from './project-header';

export default function ProjectRoutes() {
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
            addons: (exists) => [<PlanUpgradeButton />, ...exists],
            homeLink: joinURL(blocklet?.prefix || '', 'projects'),
          }}
          MenusDrawerProps={{ sx: { [`.${backdropClasses.root}`]: { top: 64 } } }}
          sx={{
            bgcolor: 'background.default',

            '> .dashboard-header': {
              border: 'none',
              borderBottom: '1px solid',
              borderColor: 'divider',
            },

            '> .dashboard-body': {
              '> .dashboard-aside': {
                [`.${paperClasses.root}`]: {
                  border: 'none',
                  bgcolor: 'background.default',
                },
              },
              '> .dashboard-content': {
                bgcolor: 'background.default',
                overflow: 'hidden',
              },
            },
          }}>
          <ErrorBoundary>
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
                  <Route path="knowledge">
                    <Route index element={<Navigate to={currentGitStore.getState().getCurrentBranch()} replace />} />
                    <Route path=":ref/*" element={<KnowledgeRoutes />} />
                  </Route>
                  <Route path="variables">
                    <Route index element={<Navigate to={currentGitStore.getState().getCurrentBranch()} replace />} />
                    <Route path=":ref/*" element={<VariablesList />} />
                  </Route>
                  <Route path="logs">
                    <Route index element={<Navigate to={currentGitStore.getState().getCurrentBranch()} replace />} />
                    <Route path=":ref/*" element={<LogMessages />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </StyledDashboard>
      </DndProvider>
    </UploaderProvider>
  );
}

const ProjectsPage = lazy(() => import('./projects-page'));

const ProjectPage = lazy(() => import('./project-page'));

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

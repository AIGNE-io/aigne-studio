import AigneLogo from '@app/components/aigne-logo';
import ErrorBoundary from '@app/components/error/error-boundary';
import { SubscribeButton } from '@blocklet/aigne-hub/components';
import { Dashboard } from '@blocklet/studio-ui';
import { GlobalStyles, backdropClasses, circularProgressClasses, paperClasses, styled } from '@mui/material';
import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { joinURL } from 'ufo';

import Loading from '../../components/loading';
import { PlanUpgradeButton } from '../../components/multi-tenant-restriction';
import ExploreCategoryLayout from './layout';

export default function ExploreCategoryRoutes() {
  return (
    <>
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
          addons: (exists) => [<SubscribeButton />, <PlanUpgradeButton />, ...exists],
          homeLink: joinURL(blocklet?.prefix || '', 'explore'),
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
        <ErrorBoundary>
          <Suspense fallback={<Loading fixed />}>
            <Routes>
              <Route element={<ExploreCategoryLayout />}>
                <Route path=":categorySlug?" element={<ExploreCategoryList />} />
                <Route path=":categorySlug/:deploymentId" element={<ExploreCategoryDetail />} />
                <Route path="apps/:deploymentId" element={<ExploreCategoryDetail />} />
              </Route>
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </StyledDashboard>
    </>
  );
}

const ExploreCategoryList = lazy(() => import('./list'));

const ExploreCategoryDetail = lazy(() => import('./detail'));

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

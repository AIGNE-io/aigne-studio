import { KnowledgeProvider } from '@app/contexts/knowledge/knowledge';
import AigneLogo from '@app/icons/aigne-logo';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import CloseIcon from '@iconify-icons/material-symbols/close';
import MenuIcon from '@iconify-icons/material-symbols/menu';
import BookIcon from '@iconify-icons/tabler/book-2';
import BrainIcon from '@iconify-icons/tabler/brain';
import { Box, CircularProgress, Drawer, IconButton, Stack, Theme, Typography } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams, useRoutes } from 'react-router-dom';
import { joinURL } from 'ufo';

import ProjectBrand from './project-brand';
import { AgentTokenUsage, HeaderActions, MobileHeaderActions } from './prompt-actions';
import SegmentedControl from './segmented-control';
import { FontFamilyHelmet } from './settings/font-family-helmet';

export default function ProjectHeader() {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { projectId } = useParams();
  if (!projectId) throw new Error('Missing required param projectId');

  const pathname = useLocation().pathname.toLowerCase();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

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

  const options = useMemo(() => {
    return [
      {
        value: 'prompts',
        label: t('agent'),
        icon: (
          <Box
            data-testid="prompts"
            component={AigneLogo}
            sx={{
              fontSize: 15,
              mr: 1,
            }}
          />
        ),
      },
      {
        value: 'knowledge',
        label: t('knowledge.menu'),
        icon: (
          <Box
            data-testid="knowledge"
            component={Icon}
            icon={BookIcon}
            sx={{
              fontSize: 15,
              mr: 1,
            }}
          />
        ),
      },
      {
        value: 'variables',
        label: t('memory.title'),
        icon: (
          <Box
            data-testid="memory"
            component={Icon}
            icon={BrainIcon}
            sx={{
              fontSize: 15,
              mr: 1,
            }}
          />
        ),
      },
    ];
  }, [t]);

  return (
    <KnowledgeProvider>
      <Stack
        sx={{
          height: 1,
          overflow: 'hidden',
        }}>
        <FontFamilyHelmet />
        <Box
          className="between"
          sx={{
            height: 64,
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, md: 3 },
          }}>
          <Box
            sx={{
              flex: 1,

              maxWidth: {
                md: '33.3%',
                xs: 'calc(100% - 64px)',
              },
            }}>
            <ProjectBrand />
          </Box>
          <Box
            sx={{
              flex: 1,
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'center',
            }}>
            <SegmentedControl
              value={current}
              options={options}
              onChange={(value) => {
                if (value) navigate(joinURL('..', projectId || '', value));
              }}
            />
          </Box>
          <Box
            sx={{
              flex: 1,
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'flex-end',
            }}>
            <ActionRoutes />
          </Box>
          <IconButton onClick={() => setDrawerOpen(!drawerOpen)} sx={{ mr: -1.5, display: { md: 'none' } }}>
            {drawerOpen ? <Icon icon={CloseIcon} /> : <Icon icon={MenuIcon} />}
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            height: 0,
            overflow: 'hidden',
            bgcolor: 'background.default',
          }}>
          <Suspense
            fallback={
              <Box
                className="center"
                sx={{
                  flex: 1,
                  width: 1,
                  height: 1,
                }}>
                <CircularProgress size={30} />
              </Box>
            }>
            <Outlet />
          </Suspense>
        </Box>

        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{
              disablePortal: false,
              keepMounted: true,
              BackdropComponent: undefined,
            }}
            anchor="right"
            sx={{
              zIndex: (theme) => theme.zIndex.appBar - 1,
            }}
            slotProps={{
              paper: {
                style: {
                  top: 0,
                  bottom: 0,
                  boxShadow: 'none',
                },
              },
            }}>
            <Stack sx={{ width: '80vw', maxWidth: 300, bgcolor: 'background.default', p: 2, pt: 10, height: 1 }}>
              <Stack sx={{ gap: 1.5, flex: 1 }} onClick={() => setDrawerOpen(false)}>
                {options.map((option) => {
                  return (
                    <Box
                      className="center"
                      key={option.value}
                      onClick={() => {
                        navigate(joinURL('..', projectId || '', option.value));
                      }}
                      sx={{
                        justifyContent: 'flex-start',
                      }}>
                      <Box className="center">{option.icon}</Box>
                      <Typography
                        className="center"
                        sx={{
                          fontWeight: 500,
                          fontSize: 16,
                          lineHeight: '28px',
                          color: 'text.primary',
                        }}>
                        {option.label}
                      </Typography>
                    </Box>
                  );
                })}

                <MobileActionRoutes />
              </Stack>

              <MobileTokenUsage />
            </Stack>
          </Drawer>
        )}
      </Stack>
    </KnowledgeProvider>
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

function MobileActionRoutes() {
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
              element: <MobileHeaderActions />,
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

function MobileTokenUsage() {
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
              element: <AgentTokenUsage />,
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

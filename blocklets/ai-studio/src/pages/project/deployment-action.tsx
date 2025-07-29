import LoadingButton from '@app/components/loading/loading-button';
import { useMultiTenantRestriction } from '@app/components/multi-tenant-restriction';
import { PlanAlert } from '@app/components/multi-tenant-restriction/plan-alert';
import { useCurrentProject } from '@app/contexts/project';
import { useIsAdmin } from '@app/contexts/session';
import { theme } from '@app/theme/theme';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { AssistantYjs, isAssistant } from '@blocklet/ai-runtime/types';
import ComponentInstaller from '@blocklet/ui-react/lib/ComponentInstaller';
import { Icon } from '@iconify-icon/react';
import ArrowLeft from '@iconify-icons/tabler/chevron-left';
import LockIcon from '@iconify-icons/tabler/lock';
import RocketIcon from '@iconify-icons/tabler/rocket';
import ShareIcon from '@iconify-icons/tabler/share';
import View360 from '@iconify-icons/tabler/view-360';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogContent,
  Divider,
  FormControl,
  FormControlLabel,
  Grow,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  Stack,
  SxProps,
  Theme,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { compact } from 'lodash';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { Suspense, useState } from 'react';

import { Deployment, createDeployment, getDeploymentByProjectId, updateDeployment } from '../../libs/deployment';
import PublishView from './publish-view';
import PublishButton from './publish/publish-button';
import { saveButtonState } from './state';
import { useProjectStore } from './yjs-state';

export default function DeploymentAction() {
  const deploymentPopperState = usePopupState({ variant: 'popper', popupId: 'deployment' });
  const deploymentDialogState = usePopupState({ variant: 'dialog', popupId: 'deployment' });
  const { t } = useLocaleContext();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const { projectId, projectRef } = useCurrentProject();

  const { data, loading, run } = useRequest(() => getDeploymentByProjectId({ projectId, projectRef }), {
    refreshDeps: [projectId, projectRef],
  });

  return (
    <>
      <LoadingButton
        data-testid="deploy-button"
        variant="contained"
        startIcon={<Box component={Icon} icon={RocketIcon} sx={{ fontSize: 16 }} />}
        size="small"
        sx={{ px: 2 }}
        disabled={loading}
        {...(isMobile ? { onClick: deploymentDialogState.open } : { ...bindTrigger(deploymentPopperState) })}>
        {t('deploy')}
      </LoadingButton>
      <Popper {...bindPopper(deploymentPopperState)} sx={{ zIndex: 1101 }} transition placement="bottom-end">
        {({ TransitionProps }) => (
          <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
            <Paper
              sx={{
                border: '1px solid #ddd',
                height: '100%',
                overflow: 'auto',
                mt: 1,
              }}>
              <ClickAwayListener
                onClickAway={(e) => (e.target as HTMLElement)?.localName !== 'body' && deploymentPopperState.close()}>
                <Box>
                  {data ? (
                    <Suspense fallback={<CircularProgress />}>
                      <ComponentInstaller
                        did={[
                          'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
                          'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
                          'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
                        ]}>
                        <UpdateApp id={data.id} data={data} run={run} sx={{ width: 400, gap: 2, py: 3 }} />
                      </ComponentInstaller>
                    </Suspense>
                  ) : (
                    <DeployApp run={run} projectId={projectId} projectRef={projectRef} sx={{ width: 400 }} />
                  )}
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
      <Dialog
        {...bindDialog(deploymentDialogState)}
        fullScreen
        hideBackdrop
        sx={{ mt: '65px' }}
        slotProps={{
          paper: { elevation: 0 }
        }}>
        <DialogContent sx={{ px: '0 !important' }}>
          <Stack sx={{
            gap: 2
          }}>
            <Box sx={{
              px: 1
            }}>
              <Button
                sx={{ p: 0 }}
                onClick={deploymentDialogState.close}
                startIcon={<Box component={Icon} icon={ArrowLeft} sx={{ fontSize: 16 }} />}>
                {t('back')}
              </Button>
            </Box>

            <Box>
              {data ? (
                <Suspense fallback={<CircularProgress />}>
                  <ComponentInstaller
                    did={[
                      'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
                      'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
                      'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
                    ]}>
                    <UpdateApp id={data.id} data={data} run={run} sx={{ width: 1, gap: 2 }} />
                  </ComponentInstaller>
                </Suspense>
              ) : (
                <DeployApp run={run} projectId={projectId} projectRef={projectRef} sx={{ width: 1 }} />
              )}
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DeployApp({
  projectId,
  projectRef,
  run,
  sx,
}: {
  projectId: string;
  projectRef: string;
  run: () => void;
  sx?: SxProps;
}) {
  const { t } = useLocaleContext();
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const { dialog, ensureEntryAgent } = useEnsureEntryAgent();

  const handleVisibilityChange = (event: any) => {
    setVisibility(event.target.value);
  };

  const onSubmit = async () => {
    try {
      if (!(await ensureEntryAgent())) return;

      await saveButtonState.getState().save?.({ skipConfirm: true, skipCommitIfNoChanges: true });

      await createDeployment({
        projectId,
        projectRef,
        access: visibility,
      });

      run();

      Toast.success('Deployed successfully');
    } catch (error) {
      Toast.error(error.message);
    }
  };

  const { quotaChecker } = useMultiTenantRestriction();
  const pass = quotaChecker.checkPrivateDeploy({ showPrice: false });

  return (
    <Box sx={sx} data-testid="create-deploy-popper">
      {dialog}
      <Box sx={{
        p: 3
      }}>
        <Stack sx={{
          gap: 0.75
        }}>
          <Box component="h3" sx={{
            m: 0
          }}>
            {t('deployments.title')}
          </Box>
          <Typography variant="caption">{t('deployments.deployDescription')}</Typography>
        </Stack>
      </Box>
      <Box
        sx={{
          p: 3,
          pt: 0
        }}>
        <Stack sx={{
          gap: 1
        }}>
          <Typography variant="body1">{t('deployments.visibility')}</Typography>

          <Card sx={{ width: 1, boxShadow: 0 }}>
            <CardContent sx={{ p: 0, m: 0 }}>
              <FormControl component="fieldset">
                <RadioGroup value={visibility} onChange={handleVisibilityChange}>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    value="public"
                    control={<Radio />}
                    label={
                      <Box
                        data-testid="public-visibility-label"
                        sx={{
                          display: "flex",
                          alignItems: "center"
                        }}>
                        <Box component={Icon} icon={View360} sx={{ mr: 1, fontSize: 20 }} />
                        <Box>
                          <Typography variant="body1">{t('public')}</Typography>
                          <Typography variant="body2" sx={{
                            color: "text.secondary"
                          }}>
                            {t('deployments.publicDescription')}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    disabled={!pass}
                    sx={{ m: 0, mt: 1 }}
                    value="private"
                    control={<Radio />}
                    label={
                      <Box
                        data-testid="private-visibility-label"
                        sx={{
                          display: "flex",
                          alignItems: "center"
                        }}>
                        <Box component={Icon} icon={LockIcon} sx={{ mr: 1, fontSize: 20 }} />
                        <Box>
                          <Typography variant="body1">{t('private')}</Typography>
                          <Typography variant="body2" sx={{
                            color: "text.secondary"
                          }}>
                            {t('deployments.privateDescription')}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </CardContent>
            {!pass && <PlanAlert sx={{ mt: 1 }}>{t('upgradePrompts.privateDeploy.desc')}</PlanAlert>}
          </Card>
        </Stack>
      </Box>
      <Stack
        sx={{
          p: 3,
          pt: 0
        }}>
        <Stack
          sx={{
            flexDirection: "row",
            justifyContent: "space-between"
          }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center"
            }}>
            <PublishButton />
          </Box>

          <LoadingButton variant="contained" onClick={onSubmit} data-testid="add-deploy-button">
            {t('deploy')}
          </LoadingButton>
        </Stack>
      </Stack>
    </Box>
  );
}

function UpdateApp({ id, data, run, sx }: { id: string; data: Deployment; run: () => void; sx?: SxProps }) {
  const { t } = useLocaleContext();
  const isAdmin = useIsAdmin();

  const [visibility, setVisibility] = useState<'public' | 'private'>(data.access || 'public');
  const handleVisibilityChange = (event: any) => setVisibility(event.target.value);
  const { dialog, ensureEntryAgent } = useEnsureEntryAgent();

  const onSubmit = async () => {
    try {
      if (!(await ensureEntryAgent())) return;

      await saveButtonState.getState().save?.({ skipConfirm: true, skipCommitIfNoChanges: true });

      await updateDeployment(id, { access: visibility });

      run();

      Toast.success(t('deployments.updateSuccess'));
    } catch (error) {
      Toast.error(error.message);
    }
  };

  return (
    <Stack sx={sx} data-testid="update-deploy-dialog">
      {dialog}
      <Box sx={{
        px: 3
      }}>
        <Box component="h3" sx={{
          m: 0
        }}>
          {t('deployments.updateApp')}
        </Box>

        <Typography variant="caption">{t('deployments.updateAppDescription')}</Typography>
      </Box>
      <Stack
        sx={{
          px: 3,
          gap: 0.5
        }}>
        <Typography variant="subtitle1">{t('deployments.visibility')}</Typography>

        <Card sx={{ width: 1, boxShadow: 0 }}>
          <CardContent sx={{ p: '0 !important', m: 0 }}>
            <FormControl component="fieldset">
              <RadioGroup value={visibility} onChange={handleVisibilityChange}>
                <FormControlLabel
                  sx={{ m: 0 }}
                  value="public"
                  control={<Radio />}
                  label={
                    <Box
                      data-testid="public-visibility-label"
                      sx={{
                        display: "flex",
                        alignItems: "center"
                      }}>
                      <Box component={Icon} icon={View360} sx={{ mr: 1, fontSize: 20 }} />
                      <Box>
                        <Typography variant="body1">{t('public')}</Typography>
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          {t('deployments.publicDescription')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <FormControlLabel
                  disabled={!isAdmin}
                  sx={{ m: 0, mt: 1 }}
                  value="private"
                  control={<Radio />}
                  label={
                    <Box
                      data-testid="private-visibility-label"
                      sx={{
                        display: "flex",
                        alignItems: "center"
                      }}>
                      <Box component={Icon} icon={LockIcon} sx={{ mr: 1, fontSize: 20 }} />
                      <Box>
                        <Typography variant="body1">{t('private')}</Typography>
                        <Typography variant="body2" sx={{
                          color: "text.secondary"
                        }}>
                          {t('deployments.privateDescription')}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>
          </CardContent>

          {!isAdmin && (
            <Typography variant="caption" sx={{
              mt: 2
            }}>
              {t('deployments.toEnablePrivateProjects')}
              <Box
                component="a"
                href="https://store.blocklet.dev/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB"
                sx={{ ml: 1 }}>
                {t('deployments.launchAigne')}
              </Box>
            </Typography>
          )}
        </Card>
      </Stack>
      <Divider />
      <Stack
        sx={{
          px: 3,
          gap: 0.5
        }}>
        <Typography variant="subtitle1">{t('deployments.currentDeployment')}</Typography>

        <List
          sx={{
            m: 0,
            p: 0,
            '& .MuiListItem-root': {
              transition: 'background-color 0.3s',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            },
            '& .MuiListItemButton-root': {
              transition: 'all 0.3s',
              '&:hover': {
                backgroundColor: 'transparent',
                transform: 'translateX(4px)',
              },
            },
          }}>
          {compact([
            {
              text: t('deployments.appPage'),
              icon: <Box component={Icon} icon={ShareIcon} sx={{ fontSize: 20 }} />,
              children: (
                <PublishView
                  key="publish-view"
                  projectId={data.projectId}
                  projectRef={data.projectRef}
                  deploymentId={id}
                />
              ),
              handle: () => {},
            },
          ]).map((item) => {
            if (item.children) {
              return item.children;
            }

            return (
              <ListItem
                key={item.text}
                dense
                disablePadding
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  overflow: 'hidden',
                }}
                onClick={item.handle}>
                <ListItemButton sx={{ p: 0.5, m: 0 }}>
                  <ListItemIcon sx={{ minWidth: 0, mr: 1 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiTypography-root': {
                        fontWeight: 500,
                        color: theme.palette.text.primary,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Stack>
      <Box
        sx={{
          px: 3,
          pt: 0
        }}>
        <Stack
          sx={{
            flexDirection: "row",
            justifyContent: "space-between"
          }}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center"
            }}>
            <PublishButton />
          </Box>

          <LoadingButton variant="contained" onClick={onSubmit} data-testid="update-deploy-button">
            {t('update')}
          </LoadingButton>
        </Stack>
      </Box>
    </Stack>
  );
}

function useEnsureEntryAgent() {
  const { projectId, projectRef } = useCurrentProject();
  const { t } = useLocaleContext();
  const { store, config } = useProjectStore(projectId, projectRef);
  const hasEntry = store.files[config?.entry!];
  const { dialog, showDialog } = useDialog();

  const ensureEntryAgent = async () => {
    if (hasEntry) {
      return true;
    }

    const files = Object.values(store.files).filter(
      (file): file is NonNullable<AssistantYjs> => !!file && isAssistant(file)
    );

    if (!files.length) {
      throw new Error('No entry agent found');
    } else if (files.length === 1) {
      config.entry = files[0]!.id;
      return true;
    }

    return new Promise<boolean>((resolve) => {
      let value = hasEntry ? config.entry : undefined;

      showDialog({
        maxWidth: 'md',
        fullWidth: true,
        title: t('selectEntryAgentTitle'),
        content: (
          <Box>
            <Alert severity="info">{t('selectEntryAgentDescription')}</Alert>

            <EntryAgentSelect files={files} value={value} onChange={(v) => (value = v)} />
          </Box>
        ),
        cancelText: t('cancel'),
        okText: t('confirm'),
        onOk: () => {
          if (!value) {
            const error = new Error('Please select an entry agent');
            Toast.error(error.message);
            throw error;
          }
          config.entry = value;
          resolve(true);
        },
        onCancel: () => resolve(false),
      });
    });
  };

  return { dialog, ensureEntryAgent };
}

function EntryAgentSelect({
  files,
  value,
  onChange,
}: {
  files: AssistantYjs[];
  value?: string;
  onChange?: (value?: string) => void;
}) {
  const { t } = useLocaleContext();
  const [checked, setChecked] = useState(value);

  const handleChange = (file: AssistantYjs) => {
    setChecked(file.id);
    onChange?.(file.id);
  };

  return (
    <List>
      {files.map((file) => (
        <ListItem
          key={file.id}
          disablePadding
          secondaryAction={<Checkbox edge="end" onChange={() => handleChange(file)} checked={checked === file.id} />}>
          <ListItemButton onClick={() => handleChange(file)}>
            <ListItemText primary={file.name || t('unnamed')} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

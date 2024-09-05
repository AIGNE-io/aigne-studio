import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import ComponentInstaller from '@blocklet/ui-react/lib/ComponentInstaller';
import { Icon } from '@iconify-icon/react';
import ClockIcon from '@iconify-icons/tabler/clock';
import LockIcon from '@iconify-icons/tabler/lock';
import RocketIcon from '@iconify-icons/tabler/rocket';
import ShareIcon from '@iconify-icons/tabler/share';
import View360 from '@iconify-icons/tabler/view-360';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  ClickAwayListener,
  FormControl,
  FormControlLabel,
  Grow,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { Suspense, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { createOrUpdateDeployment, getDeploymentById } from '../../libs/deployment';
import { getFileIdFromPath } from '../../utils/path';

export default function DeploymentAction() {
  const deploymentPopperState = usePopupState({ variant: 'popper', popupId: 'deployment' });
  const { t } = useLocaleContext();

  const { projectId, ref: gitRef, '*': filepath } = useParams();
  const fileId = filepath && getFileIdFromPath(filepath);

  const { data, loading, run } = useRequest(
    () => getDeploymentById({ projectId: projectId!, projectRef: gitRef!, agentId: fileId! }),
    { refreshDeps: [projectId, gitRef, fileId] }
  );

  return (
    <>
      <LoadingButton
        variant="contained"
        startIcon={<Box component={Icon} icon={RocketIcon} sx={{ fontSize: 16 }} />}
        size="small"
        sx={{ px: 2 }}
        disabled={loading}
        {...bindTrigger(deploymentPopperState)}>
        {t('deployments.deployApp')}
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
                {data?.deployment ? (
                  <Suspense fallback={<CircularProgress />}>
                    <ComponentInstaller
                      did={[
                        'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
                        'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
                        'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
                      ]}>
                      <UpdateApp
                        onClose={deploymentPopperState.close}
                        run={run}
                        projectId={projectId!}
                        projectRef={gitRef!}
                        agentId={fileId!}
                        access={data.deployment.access}
                        id={data.deployment.id}
                      />
                    </ComponentInstaller>
                  </Suspense>
                ) : (
                  <DeployApp
                    onClose={deploymentPopperState.close}
                    run={run}
                    projectId={projectId!}
                    projectRef={gitRef!}
                    agentId={fileId!}
                  />
                )}
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
}

function DeployApp({
  projectId,
  projectRef,
  agentId,
  onClose,
  run,
}: {
  projectId: string;
  projectRef: string;
  agentId: string;
  onClose: () => void;
  run: () => void;
}) {
  const isAdmin = useIsAdmin();
  const { t } = useLocaleContext();
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const handleVisibilityChange = (event: any) => {
    setVisibility(event.target.value);
  };

  const onSubmit = async () => {
    try {
      await createOrUpdateDeployment({
        projectId,
        projectRef,
        agentId,
        access: visibility,
      });

      run();

      Toast.success('Deployed successfully');
    } catch (error) {
      Toast.error(error.message);
    }
  };

  return (
    <Box width={400}>
      <Box p={3}>
        <Stack gap={0.75}>
          <Box component="h3" m={0}>
            {t('deployments.deployApp')}
          </Box>
          <Typography variant="caption">{t('deployments.deployDescription')}</Typography>
        </Stack>
      </Box>

      <Box p={3} pt={0}>
        <Stack gap={1}>
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
                      <Box display="flex" alignItems="center">
                        <Box component={Icon} icon={View360} sx={{ mr: 1, fontSize: 20 }} />
                        <Box>
                          <Typography variant="body1">{t('public')}</Typography>
                          <Typography variant="body2" color="text.secondary">
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
                      <Box display="flex" alignItems="center">
                        <Box component={Icon} icon={LockIcon} sx={{ mr: 1, fontSize: 20 }} />
                        <Box>
                          <Typography variant="body1">{t('private')}</Typography>
                          <Typography variant="body2" color="text.secondary">
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
              <Typography variant="caption" mt={2}>
                {t('deployments.toEnablePrivateProjects')}
                <Box component="a" href="https://store.blocklet.dev/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB">
                  {t('deployments.launchAigne')}
                </Box>
              </Typography>
            )}
          </Card>
        </Stack>
      </Box>

      <Box p={3} pt={0}>
        <Stack flexDirection="row" justifyContent="space-between">
          <Button variant="outlined" onClick={onClose}>
            {t('cancel')}
          </Button>

          <LoadingButton variant="contained" onClick={onSubmit}>
            {t('deploy')}
          </LoadingButton>
        </Stack>
      </Box>
    </Box>
  );
}

function UpdateApp({
  projectId,
  projectRef,
  agentId,
  access,
  id,
  onClose,
  run,
}: {
  projectId: string;
  projectRef: string;
  agentId: string;
  access: 'private' | 'public';
  id: string;
  onClose: () => void;
  run: () => void;
}) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const onSubmit = async () => {
    try {
      await createOrUpdateDeployment({
        projectId,
        projectRef,
        agentId,
        access,
      });

      run();

      Toast.success('Updated successfully');
    } catch (error) {
      Toast.error(error.message);
    }
  };

  return (
    <Box width={400}>
      <Box p={3}>
        <Box component="h3" m={0}>
          {t('deployments.updateApp')}
        </Box>
        <Typography variant="caption">{t('deployments.updateAppDescription')}</Typography>
      </Box>

      <Box p={3} pt={0}>
        <Stack gap={1}>
          <Typography variant="subtitle1">{t('deployments.currentDeployment')}</Typography>
          <List sx={{ p: 0 }} component={Stack} gap={1}>
            {[
              {
                text: t('deployments.appPage'),
                icon: <Box component={Icon} icon={ShareIcon} sx={{ fontSize: 20 }} />,
                handle: () => {
                  window.open(joinURL(globalThis.location.origin, AIGNE_RUNTIME_MOUNT_POINT, 'share', id), '_blank');
                },
              },
              {
                text: t('deployments.deploymentPage'),
                icon: <Box component={Icon} icon={ClockIcon} sx={{ fontSize: 20 }} />,
                handle: () => {
                  navigate(joinURL('/projects', projectId, 'deployments', projectRef, id));
                },
              },
            ].map((item) => (
              <ListItem key={item.text} sx={{ m: 0, p: 0, cursor: 'pointer' }} onClick={item.handle}>
                <ListItemIcon sx={{ minWidth: 0, mr: 1 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Stack>
      </Box>

      {/* <Box p={3} pt={0}>
        <Divider sx={{ m: 0 }} />
      </Box>

      <Box p={3} pt={0}>
        <Typography variant="subtitle1" gutterBottom>
          {t('deployments.updateApp')}
        </Typography>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="body2">{t('deployments.appIsUpToDate')}</Typography>
        </Box>
      </Box> */}

      <Box p={3} pt={0}>
        <Stack flexDirection="row" justifyContent="space-between">
          <Button variant="outlined" onClick={onClose}>
            {t('cancel')}
          </Button>

          <LoadingButton variant="contained" onClick={onSubmit}>
            {t('update')}
          </LoadingButton>
        </Stack>
      </Box>
    </Box>
  );
}

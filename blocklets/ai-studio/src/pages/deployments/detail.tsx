import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import DidAddress from '@arcblock/did-connect/lib/Address';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import EditIcon from '@iconify-icons/tabler/edit';
import LockIcon from '@iconify-icons/tabler/lock';
import ShareIcon from '@iconify-icons/tabler/share';
import View360 from '@iconify-icons/tabler/view-360';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { PopupState, bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { getDeployment, updateDeployment } from '../../libs/deployment';
import Close from '../project/icons/close';
import { useProjectStore } from '../project/yjs-state';

function DeploymentDialog({
  dialogState,
  id,
  access,
  run,
}: {
  dialogState: PopupState;
  id: string;
  access: 'private' | 'public';
  run: () => void;
}) {
  const isAdmin = useIsAdmin();
  const { t } = useLocaleContext();

  const [visibility, setVisibility] = useState(access);
  const handleVisibilityChange = (event: any) => {
    setVisibility(event.target.value);
  };

  const onSubmit = async () => {
    try {
      await updateDeployment(id, { access: visibility });
      dialogState.close();
      run();
      Toast.success('Updated successfully');
    } catch (error) {
      Toast.error(error.message);
    }
  };

  return (
    <Dialog {...bindDialog(dialogState)} fullWidth maxWidth="sm" component="form" onSubmit={(e) => e.preventDefault()}>
      <DialogTitle className="between">
        <Box>{t('deployments.updateApp')}</Box>
        <IconButton size="small" onClick={dialogState.close}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
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
      </DialogContent>

      <DialogActions>
        <Stack flexDirection="row" gap={1}>
          <Button variant="outlined" onClick={dialogState.close}>
            {t('cancel')}
          </Button>
          <LoadingButton variant="contained" onClick={onSubmit}>
            {t('update')}
          </LoadingButton>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

function DeploymentDetail() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef, id } = useParams();
  if (!projectId || !gitRef || !id) throw new Error('Missing required params `projectId` or `ref` or `id`');
  const dialogState = usePopupState({ variant: 'popper' });

  const navigate = useNavigate();
  const { getFileById } = useProjectStore(projectId!, gitRef!, true);
  const { data, loading, run } = useRequest(() => getDeployment({ id: id! }), { refreshDeps: [projectId, gitRef, id] });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="800px">
        <CircularProgress />
      </Box>
    );
  }

  const file = data?.deployment.agentId ? getFileById(data?.deployment.agentId) : { name: '', description: '' };
  const url = joinURL(globalThis.location.origin, AIGNE_RUNTIME_MOUNT_POINT, 'share', id);

  return (
    <>
      <Container sx={{ mt: 2 }}>
        <Paper sx={{ p: 2 }} component={Stack} gap={2}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Typography component="span" sx={{ cursor: 'pointer' }} onClick={() => navigate('..')}>
                {t('deployments.title')}
              </Typography>
              <Typography sx={{ color: 'text.primary' }}>{file?.name || t('unnamed')}</Typography>
            </Breadcrumbs>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ m: 0 }}>
              {t('deployments.info')}
            </Typography>
            <IconButton onClick={dialogState.open}>
              <Box component={Icon} icon={EditIcon} sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('deployments.link')}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
              <TextField fullWidth value={url} InputProps={{ readOnly: true }} variant="outlined" size="small" />
              <IconButton
                sx={{
                  '.did-address-copy-wrapper': {
                    margin: '0px !important',
                  },
                }}>
                <Box component={DidAddress} content={url} size={16} sx={{ display: 'flex' }} />
              </IconButton>
              <IconButton onClick={() => window.open(url, '_blank')}>
                <Box component={Icon} icon={ShareIcon} sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('deployments.visibility')}
            </Typography>
            <Chip label={t(data?.deployment.access)} color="success" size="small" />
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('title')}
            </Typography>
            <Typography>{file?.name || t('unnamed')}</Typography>
          </Box>

          {file?.description && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t('description')}
              </Typography>
              <Typography>{file?.description}</Typography>
            </Box>
          )}
        </Paper>
      </Container>

      <DeploymentDialog dialogState={dialogState} id={id} access={data?.deployment.access!} run={run} />
    </>
  );
}

export default DeploymentDetail;

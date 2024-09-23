import { getCategories } from '@app/libs/category';
import DidAddress from '@arcblock/did-connect/lib/Address';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import EditIcon from '@iconify-icons/tabler/edit';
import ShareIcon from '@iconify-icons/tabler/share';
import {
  Box,
  Breadcrumbs,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { usePopupState } from 'material-ui-popup-state/hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { getDeployment } from '../../libs/deployment';
import { useProjectStore } from '../project/yjs-state';
import DeploymentDialog from './dialog';

function DeploymentDetail() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef, id } = useParams();
  if (!projectId || !gitRef || !id) throw new Error('Missing required params `projectId` or `ref` or `id`');
  const dialogState = usePopupState({ variant: 'popper' });

  const navigate = useNavigate();
  const { projectSetting } = useProjectStore(projectId, gitRef);

  const { data, loading, refresh } = useRequest(() => getDeployment({ id: id! }), {
    refreshDeps: [projectId, gitRef, id],
  });
  const { data: categories, loading: categoriesLoading } = useRequest(getCategories, {
    defaultParams: [{ page: 1, pageSize: 1000 }],
    refreshDeps: [],
  });

  if (loading || categoriesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="800px">
        <CircularProgress />
      </Box>
    );
  }

  const url = joinURL(globalThis.location.origin, window.blocklet.prefix, '/explore/apps', id);
  const rows = (data?.deployment?.categories || []).map(
    (category) => categories?.list?.find((c) => c.id === category)?.name
  );

  return (
    <>
      <Container sx={{ mt: 2 }}>
        <Paper sx={{ p: 2 }} component={Stack} gap={2}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Typography component="span" sx={{ cursor: 'pointer' }} onClick={() => navigate('..')}>
                {t('deployments.title')}
              </Typography>
              <Typography sx={{ color: 'text.primary' }}>{projectSetting?.name || t('unnamed')}</Typography>
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
            <Chip label={t(data?.deployment?.access!)} color="success" size="small" />
          </Box>

          {!!rows.length && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t('category.title')}
              </Typography>

              <Box display="flex" gap={1} alignItems="center">
                {rows.map((row) => {
                  return <Chip key={row} label={row} size="small" />;
                })}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('title')}
            </Typography>
            <Typography>{projectSetting?.name || t('unnamed')}</Typography>
          </Box>

          {projectSetting?.description && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t('description')}
              </Typography>
              <Typography>{projectSetting?.description}</Typography>
            </Box>
          )}
        </Paper>
      </Container>

      <DeploymentDialog
        dialogState={dialogState}
        id={id}
        access={data?.deployment?.access!}
        categories={data?.deployment?.categories!}
        run={refresh}
        productHuntUrl={data?.deployment?.productHuntUrl}
        productHuntBannerUrl={data?.deployment?.productHuntBannerUrl}
      />
    </>
  );
}

export default DeploymentDetail;

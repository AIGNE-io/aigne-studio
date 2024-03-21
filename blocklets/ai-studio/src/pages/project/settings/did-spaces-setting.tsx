import { useSessionContext } from '@app/contexts/session';
import { getProjectDataUrlInSpace } from '@app/libs/did-spaces';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { CheckCircleOutlineRounded, ErrorOutlineRounded, SyncRounded } from '@mui/icons-material';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import { Button, CircularProgress, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { useCallback, useState } from 'react';

import PromiseLoadingButton from '../../../components/promise-loading-button';
import { getErrorMessage } from '../../../libs/api';
import { isTheErrorShouldShowMergeConflict, useMergeConflictDialog } from '../save-button';
import { useProjectState } from '../state';

export default function DidSpacesSetting({ projectId }: { projectId: string }) {
  const { t, locale } = useLocaleContext();
  const { showMergeConflictDialog } = useMergeConflictDialog({ projectId });
  const { state, updateProject, sync } = useProjectState(projectId, getDefaultBranch());
  const { session } = useSessionContext();

  const [authSyncUpdating, setAutoSyncUpdating] = useState<boolean | 'success' | 'error'>(false);

  const changeDidSpaceAutoSync = useCallback(
    async (didSpaceAutoSync: boolean) => {
      setAutoSyncUpdating(true);
      try {
        await updateProject(projectId, { didSpaceAutoSync });
        setAutoSyncUpdating('success');
      } catch (error) {
        setAutoSyncUpdating('error');
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [projectId, updateProject]
  );

  return (
    <Stack gap={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <FormControlLabel
          label={t('autoSync')}
          labelPlacement="start"
          slotProps={{ typography: { sx: { mr: 2 } } }}
          control={
            <Switch
              defaultChecked={state?.project?.didSpaceAutoSync ?? false}
              onChange={(_, checked) => changeDidSpaceAutoSync(checked)}
            />
          }
        />

        <Stack justifyContent="center" alignItems="center" width={24} height={24}>
          {authSyncUpdating === true ? (
            <CircularProgress size={20} />
          ) : authSyncUpdating === 'success' ? (
            <CheckCircleOutlineRounded color="success" sx={{ fontSize: 24 }} />
          ) : authSyncUpdating === 'error' ? (
            <ErrorOutlineRounded color="error" sx={{ fontSize: 24 }} />
          ) : null}
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" gap={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<FolderOpenOutlinedIcon />}
          onClick={async () => {
            try {
              window.open(getProjectDataUrlInSpace(session.user?.didSpace?.endpoint, projectId));
            } catch (error) {
              console.error(error);
              Toast.error(getErrorMessage(error));
              throw error;
            }
          }}>
          {t('viewData')}
        </Button>
        <PromiseLoadingButton
          size="small"
          variant="outlined"
          loadingPosition="start"
          startIcon={<SyncRounded />}
          onClick={async () => {
            try {
              await sync(projectId, 'didSpace');
              Toast.success(t('synced'));
            } catch (error) {
              if (isTheErrorShouldShowMergeConflict(error)) {
                showMergeConflictDialog();
                return;
              }
              Toast.error(getErrorMessage(error));
              throw error;
            }
          }}>
          {t('sync')}
        </PromiseLoadingButton>

        {state?.project?.didSpaceLastSyncedAt && (
          <Typography variant="caption" color="text.secondary">
            {t('syncedAt')}: <RelativeTime locale={locale} value={state.project.didSpaceLastSyncedAt} />
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

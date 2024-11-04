import { useSessionContext } from '@app/contexts/session';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { SpaceCard } from '@blocklet/did-space-react';
import { CheckCircleOutlineRounded, ErrorOutlineRounded, SyncRounded } from '@mui/icons-material';
import { CircularProgress, FormControlLabel, Stack, Typography } from '@mui/material';
import { useCallback, useState } from 'react';

import Switch from '../../../components/custom/switch';
import PromiseLoadingButton from '../../../components/promise-loading-button';
import { getErrorMessage } from '../../../libs/api';
import { isTheErrorShouldShowMergeConflict, useMergeConflictDialog } from '../save-button';
import { useProjectState } from '../state';
import GatewayAction from './gateway-action';

export default function DidSpacesSetting({ projectId }: { projectId: string }) {
  const { t, locale } = useLocaleContext();
  const { showMergeConflictDialog } = useMergeConflictDialog({ projectId });
  const { state, updateProject, sync } = useProjectState(projectId, getDefaultBranch());
  const { session } = useSessionContext();

  const [authSyncUpdating, setAutoSyncUpdating] = useState<boolean | 'success' | 'error'>(false);
  const [refreshSpaceCard, setRefreshSpaceCard] = useState(false);

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
    <Stack gap={2.5}>
      <Typography variant="subtitle2">{t('didSpaces.title')}</Typography>

      <Stack direction="row" alignItems="center" gap={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <FormControlLabel
            sx={{ m: 0 }}
            label={t('autoSync')}
            labelPlacement="end"
            slotProps={{ typography: { sx: { ml: 1 } } }}
            control={
              <Switch
                defaultChecked={state?.project?.didSpaceAutoSync ?? false}
                onChange={(_, checked) => changeDidSpaceAutoSync(checked)}
              />
            }
          />
          {authSyncUpdating ? (
            <Stack justifyContent="center" alignItems="center" width={24} height={24}>
              {authSyncUpdating === true ? (
                <CircularProgress size={16} />
              ) : authSyncUpdating === 'success' ? (
                <CheckCircleOutlineRounded color="success" sx={{ fontSize: 20 }} />
              ) : authSyncUpdating === 'error' ? (
                <ErrorOutlineRounded color="error" sx={{ fontSize: 20 }} />
              ) : null}
            </Stack>
          ) : null}
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <PromiseLoadingButton
            size="small"
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
              } finally {
                setRefreshSpaceCard((v) => !v);
              }
            }}>
            {t('sync')}
          </PromiseLoadingButton>

          {state?.project?.didSpaceLastSyncedAt && (
            <Typography variant="caption" color="#9CA3AF">
              {/* @ts-ignore */}
              <RelativeTime locale={locale} value={state.project.didSpaceLastSyncedAt} />
            </Typography>
          )}
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" gap={1}>
        <SpaceCard
          sx={{ flex: 1 }}
          selected
          compat
          endpoint={session.user?.didSpace?.endpoint}
          deps={[refreshSpaceCard]}
          action={(props) => <GatewayAction {...props} projectId={projectId} />}
        />
      </Stack>
    </Stack>
  );
}

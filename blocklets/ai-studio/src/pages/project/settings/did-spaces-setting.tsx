import { useSessionContext } from '@app/contexts/session';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SpaceCard } from '@blocklet/did-space-react';
import { CheckCircleOutlineRounded, ErrorOutlineRounded } from '@mui/icons-material';
import { CircularProgress, FormControlLabel, Stack } from '@mui/material';
import { useCallback, useState } from 'react';

import Switch from '../../../components/custom/switch';
import { getErrorMessage } from '../../../libs/api';
import { useProjectState } from '../state';
import GatewayAction from './gateway-action';

export default function DidSpacesSetting({ projectId }: { projectId: string }) {
  const { t } = useLocaleContext();
  const { state, updateProject } = useProjectState(projectId, getDefaultBranch());
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
    <Stack sx={{
      gap: 2.5
    }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 1
        }}>
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1
          }}>
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
            <Stack
              sx={{
                justifyContent: "center",
                alignItems: "center",
                width: 24,
                height: 24
              }}>
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
      </Stack>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1
        }}>
        <SpaceCard
          sx={{ flex: 1 }}
          selected
          compat
          endpoint={session.user?.didSpace?.endpoint}
          action={(props) => <GatewayAction {...props} projectId={projectId} />}
        />
      </Stack>
    </Stack>
  );
}
